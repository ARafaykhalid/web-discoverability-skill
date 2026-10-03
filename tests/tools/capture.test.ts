import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { captureSite, writeCapture } from '../../tools/lib/capture.ts';
import { loadSnapshot } from '../../tools/lib/snapshot.ts';
import { loadChecks, runChecks } from '../../tools/lib/checks/index.ts';

/**
 * `capture` is the only thing in the package that talks to a network, and the only
 * thing that produces the input every runtime check reads. Both facts are tested
 * against an injected fetch, so the suite is offline and deterministic.
 */

/** Build a fetch stand-in from a path -> response map. */
function fakeFetch(routes: Record<string, { status?: number; headers?: Record<string, string>; body?: string }>) {
  return (async (input: string | URL) => {
    const url = typeof input === 'string' ? input : input.href;
    const route = routes[url] ?? routes[new URL(url).pathname];
    if (!route) throw new Error(`ENOTFOUND ${url}`);
    // A real Headers instance, because `capture` iterates it to record the
    // response headers and a plain object with a `get` is not the same contract.
    const headers = new Headers(route.headers ?? {});
    const status = route.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      url,
      headers,
      text: async () => route.body ?? '',
    };
  }) as unknown as typeof fetch;
}

const page = (body: string) => `<!doctype html><html lang="en"><head><title>T</title></head><body>${body}</body></html>`;

/**
 * Every capture seeds the origin whether or not the caller names it, so a route
 * map without `/` would test the missing-root path in a test about something else.
 */
const withRoot = (routes: Record<string, unknown>) => ({
  '/': { headers: { 'content-type': 'text/html' }, body: page('<h1>Root</h1>') },
  ...routes,
});

describe('captureSite', () => {
  it('records status, headers, and markup for the origin', async () => {
    const result = await captureSite('https://s.test', [], {
      maxPages: 1,
      fetchImpl: fakeFetch({ '/': { status: 200, headers: { 'content-type': 'text/html', 'x-cache': 'HIT' }, body: page('<h1>Home</h1>') } }),
    });
    assert.equal(result.pages.length, 1);
    assert.equal(result.pages[0].status, 200);
    assert.equal(result.pages[0].headers['x-cache'], 'HIT');
    assert.equal(result.pages[0].indexable, true);
    assert.match(result.bodies.get('https://s.test/'), /<h1>Home<\/h1>/);
  });

  it('follows redirects by hand and records every hop', async () => {
    const result = await captureSite('https://s.test', ['/old'], {
      maxPages: 5,
      fetchImpl: fakeFetch(withRoot({
        '/old': { status: 301, headers: { location: '/new' } },
        '/new': { status: 200, headers: { 'content-type': 'text/html' }, body: page('<h1>New</h1>') },
      })),
    });
    // A chain entry is a hop, not a landing, so one redirect is one entry. This
    // matches the shape the benchmark fixtures already use for the same fact.
    const old = result.pages.find((p) => new URL(p.url).pathname === '/old');
    assert.deepEqual(old.redirect_chain, ['https://s.test/old']);
    assert.equal(old.status, 200);
    // The recorded url is the one that was requested, not where it landed.
    assert.equal(old.url, 'https://s.test/old');
  });

  it('stops at a redirect cycle instead of fetching forever', async () => {
    const result = await captureSite('https://s.test', ['/a'], {
      maxPages: 5,
      maxRedirects: 3,
      fetchImpl: fakeFetch({
        '/': { headers: { 'content-type': 'text/html' }, body: page('<h1>Root</h1>') },
        '/a': { status: 302, headers: { location: '/b' } },
        '/b': { status: 302, headers: { location: '/a' } },
      }),
    });
    const a = result.errors.find((e) => new URL(e.url).pathname === '/a');
    assert.match(a.error, /more than 3 redirects/);
    assert.equal(result.pages.some((p) => new URL(p.url).pathname === '/a'), false);
  });

  it('marks a page that declares noindex as non-indexable', async () => {
    const result = await captureSite('https://s.test', [], {
      maxPages: 1,
      fetchImpl: fakeFetch({
        '/': {
          headers: { 'content-type': 'text/html' },
          body: '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"></head><body></body></html>',
        },
      }),
    });
    assert.equal(result.pages[0].indexable, false);
  });

  it('records a response with no markup, because its status is still a fact', async () => {
    const result = await captureSite('https://s.test', ['/missing'], {
      maxPages: 5,
      fetchImpl: fakeFetch(withRoot({ '/missing': { status: 404, headers: { 'content-type': 'application/json' }, body: '{}' } })),
    });
    const missing = result.pages.find((p) => new URL(p.url).pathname === '/missing');
    assert.equal(missing.status, 404);
    // No markup means no file to point a finding at, so the paths stay empty.
    assert.equal(missing.raw_html_path, '');
  });

  it('walks same-origin links and never leaves the origin', async () => {
    const result = await captureSite('https://s.test', [], {
      maxPages: 5,
      fetchImpl: fakeFetch({
        '/': { headers: { 'content-type': 'text/html' }, body: page('<h1>H</h1><a href="/about">About</a><a href="https://elsewhere.test/x">Out</a><a href="mailto:a@b.test">Mail</a>') },
        '/about': { headers: { 'content-type': 'text/html' }, body: page('<h1>About</h1>') },
      }),
    });
    const paths = result.pages.map((p) => new URL(p.url).pathname).sort();
    assert.deepEqual(paths, ['/', '/about']);
  });

  it('treats / and /index.html as one destination', async () => {
    const result = await captureSite('https://s.test', [], {
      maxPages: 5,
      fetchImpl: fakeFetch({ '/': { headers: { 'content-type': 'text/html' }, body: page('<h1>H</h1><a href="/index.html">Self</a><a href="/">Root</a>') } }),
    });
    assert.equal(result.pages.length, 1);
  });

  it('honours max-pages exactly, not up to the concurrency batch', async () => {
    const routes: Record<string, { headers: Record<string, string>; body: string }> = {
      '/': { headers: { 'content-type': 'text/html' }, body: page('<h1>H</h1><a href="/a">a</a><a href="/b">b</a><a href="/c">c</a><a href="/d">d</a>') },
    };
    for (const name of ['a', 'b', 'c', 'd']) routes[`/${name}`] = { headers: { 'content-type': 'text/html' }, body: page(`<h1>${name}</h1>`) };
    const result = await captureSite('https://s.test', [], { maxPages: 2, concurrency: 4, fetchImpl: fakeFetch(routes) });
    assert.equal(result.pages.length, 2);
  });

  it('reports an unreachable seed as an error rather than an empty page', async () => {
    const result = await captureSite('https://s.test', ['/nope'], { maxPages: 2, fetchImpl: fakeFetch(withRoot({})) });
    assert.deepEqual(result.errors.map((e) => new URL(e.url).pathname), ['/nope']);
    assert.equal(result.pages.some((p) => new URL(p.url).pathname === '/nope'), false);
    assert.match(result.errors[0].url, /\/nope$/);
  });
});

describe('writeCapture', () => {
  it('produces a snapshot loadSnapshot reads, with the HTML on disk', async () => {
    const result = await captureSite('https://s.test', [], {
      maxPages: 1,
      fetchImpl: fakeFetch({ '/': { headers: { 'content-type': 'text/html' }, body: page('<h1>Home</h1>') } }),
    });
    const dir = mkdtempSync(join(tmpdir(), 'wds-capture-'));
    const path = writeCapture(result, dir);

    assert.ok(existsSync(path));
    const snapshot = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(snapshot.pages.length, 1);
    assert.ok(snapshot.pages[0].raw_html_path.startsWith('captures/'));

    const loaded = loadSnapshot(dir);
    assert.equal(loaded.hasRuntime, true);
    assert.equal(loaded.pages[0].rendered_html.includes('<h1>Home</h1>'), true);
    assert.equal(loaded.pages[0].status, 200);
  });

  it('lights up the runtime checks that were reporting NEEDS_RUNTIME before', async () => {
    const result = await captureSite('https://s.test', [], {
      maxPages: 1,
      fetchImpl: fakeFetch({
        // No <title>, no description, no viewport, no h1 - four separate defects
        // that only exist because the response was actually read.
        '/': { headers: { 'content-type': 'text/html' }, body: '<!doctype html><html lang="en"><head></head><body></body></html>' },
      }),
    });
    const dir = mkdtempSync(join(tmpdir(), 'wds-capture-'));
    writeCapture(result, dir);

    const { results, findings } = await runChecks(loadSnapshot(dir), { checks: await loadChecks() });
    assert.equal(results.filter((r) => r.status === 'NEEDS_RUNTIME').length, 0);
    const ids = new Set(findings.map((f) => f.requirement_id));
    assert.ok(ids.has('SEO-033'), 'the missing title should have been reported');
    assert.ok(ids.has('SEO-195'), 'the missing h1 should have been reported');
  });
});