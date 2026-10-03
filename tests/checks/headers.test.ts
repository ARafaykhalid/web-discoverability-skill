import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadChecks, runChecks } from '../../tools/lib/checks/index.ts';
import { loadSnapshot } from '../../tools/lib/snapshot.ts';
import type { Snapshot } from '../../tools/lib/snapshot.ts';

/**
 * The header checks read facts the snapshot already held while four domains had no
 * check at all, so the risk in them is specific: reporting the *absence of a
 * measurement* as the absence of a header. Every case below is a snapshot built by
 * hand rather than from a fixture, because the distinction that matters - captured
 * response versus a page synthesised from a file on disk - is not something a
 * fixture directory expresses on its own.
 */

const page = (body: string) => `<!doctype html><html lang="en"><head><title>T</title></head><body>${body}</body></html>`;

function snapshot(pages: {
  url: string;
  status?: number;
  headers?: Record<string, string>;
  html?: string;
  origin?: 'capture' | 'static-file';
}[]): Snapshot {
  return {
    root: '/synthetic',
    profile: {} as Snapshot['profile'],
    files: [],
    read: () => '',
    has: () => false,
    find: () => null,
    findAll: () => [],
    pages: pages.map((p) => {
      const html = p.html ?? page('<h1>H</h1>');
      return {
        url: p.url,
        status: p.status ?? 200,
        headers: p.headers ?? {},
        redirect_chain: [],
        raw_html: html,
        rendered_html: html,
        source_file: null,
        indexable: true,
        origin: p.origin ?? 'capture',
      };
    }),
    hasRuntime: true,
    captureOrigin: 'capture',
    capturedAt: null,
    origin: null,
    robots_txt: null,
    llms_txt: null,
    sitemaps: [],
    feeds: [],
    documents: [],
    grep: () => [],
  };
}

async function run(checkId: string, snap: Snapshot) {
  const checks = await loadChecks();
  const check = checks.find((c) => c.id === checkId);
  assert.ok(check, `${checkId} is not registered`);
  const { results } = await runChecks(snap, { checks: [check] });
  return results[0];
}

describe('header checks only judge a response that was actually fetched', () => {
  it('reports a captured response with no cache policy', async () => {
    const result = await run('cache-policy-declared', snapshot([
      { url: 'https://s.test/', headers: { 'content-type': 'text/html' } },
    ]));
    assert.equal(result.status, 'FAIL');
    assert.equal(result.findings[0].requirement_id, 'SEO-337');
  });

  it('stays silent on a page synthesised from a file, which has no server to ask', async () => {
    const result = await run('cache-policy-declared', snapshot([
      { url: '/index.html', headers: {}, origin: 'static-file' },
    ]));
    assert.equal(result.status, 'PASS');
    assert.deepEqual(result.findings, []);
  });

  it('stays silent on a captured response that recorded no headers at all', async () => {
    const result = await run('cache-policy-declared', snapshot([
      { url: 'https://s.test/', headers: {} },
    ]));
    assert.equal(result.status, 'PASS');
  });

  it('accepts a response that declares one', async () => {
    const result = await run('cache-policy-declared', snapshot([
      { url: 'https://s.test/', headers: { 'cache-control': 'public, max-age=600' } },
    ]));
    assert.equal(result.status, 'PASS');
  });
});

describe('vary-restricted-to-body', () => {
  it('reports a Vary on a header the body does not read', async () => {
    const result = await run('vary-restricted-to-body', snapshot([
      { url: 'https://s.test/', headers: { vary: 'User-Agent, Accept-Encoding' } },
    ]));
    assert.equal(result.findings[0].requirement_id, 'SEO-345');
    assert.match(result.findings[0].detail, /User-Agent/);
  });

  it('reports Vary: * ', async () => {
    const result = await run('vary-restricted-to-body', snapshot([
      { url: 'https://s.test/', headers: { vary: '*' } },
    ]));
    assert.equal(result.findings.length, 1);
    assert.match(result.findings[0].detail, /never reused/);
  });

  it('accepts the two headers an HTML response genuinely varies on', async () => {
    const result = await run('vary-restricted-to-body', snapshot([
      { url: 'https://s.test/', headers: { vary: 'Accept-Encoding, Accept-Language' } },
    ]));
    assert.equal(result.status, 'PASS');
  });
});

describe('transport-security-declared', () => {
  it('reports one finding for the origin, not one per page', async () => {
    const result = await run('transport-security-declared', snapshot([
      { url: 'https://s.test/', headers: { 'content-type': 'text/html' } },
      { url: 'https://s.test/a', headers: { 'content-type': 'text/html' } },
      { url: 'https://s.test/b', headers: { 'content-type': 'text/html' } },
    ]));
    assert.equal(result.findings.length, 1);
    assert.match(result.findings[0].detail, /3 of 3/);
  });

  it('accepts an origin that declares the policy', async () => {
    const result = await run('transport-security-declared', snapshot([
      { url: 'https://s.test/', headers: { 'strict-transport-security': 'max-age=31536000' } },
    ]));
    assert.equal(result.status, 'PASS');
  });

  it('declines to judge a capture that records no scheme', async () => {
    // A capture made with relative URLs cannot show that the origin is https at
    // all, so a missing header there is a property of the capture, not the site.
    const result = await run('transport-security-declared', snapshot([
      { url: '/', headers: { 'content-type': 'text/html' } },
    ]));
    assert.equal(result.status, 'NOT_APPLICABLE');
  });
});

describe('private-routes-excluded', () => {
  it('reports a refused route that does not ask not to be indexed', async () => {
    const result = await run('private-routes-excluded', snapshot([
      { url: 'https://s.test/admin', status: 403, headers: { 'content-type': 'text/html' } },
    ]));
    assert.equal(result.findings[0].requirement_id, 'SEO-098');
    assert.match(result.findings[0].detail, /403/);
  });

  it('accepts a refused route that does carry noindex', async () => {
    const html = '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"></head><body></body></html>';
    const result = await run('private-routes-excluded', snapshot([
      { url: 'https://s.test/admin', status: 401, headers: { 'content-type': 'text/html' }, html },
    ]));
    assert.equal(result.status, 'PASS');
  });

  it('ignores routes that were served successfully', async () => {
    const result = await run('private-routes-excluded', snapshot([
      { url: 'https://s.test/', status: 200, headers: { 'content-type': 'text/html' } },
    ]));
    assert.equal(result.status, 'PASS');
  });
});