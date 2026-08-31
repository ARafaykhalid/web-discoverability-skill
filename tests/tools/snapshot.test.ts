/**
 * Unit tests for tools/lib/snapshot.ts.
 *
 * Every fixture is a throwaway directory under os.tmpdir(). Captures are passed
 * in directly where the test is about capture semantics, and written to
 * snapshot.json where the test is about reading one off disk.
 */

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { CAPTURE_FILENAME, loadSnapshot } from '../../tools/lib/snapshot.ts';

const sandboxes = [];

/** Materialise `{ 'rel/path': contents }` into a fresh temp directory. */
function project(name, files = {}) {
  const root = mkdtempSync(join(tmpdir(), `wds-snapshot-${name}-`));
  sandboxes.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

after(() => {
  for (const root of sandboxes) rmSync(root, { recursive: true, force: true });
});

/** A directory with no .html files, so nothing can be synthesised behind our back. */
const NO_HTML = { 'notes.txt': 'no markup in here\n' };

describe('rendered_html falls back to raw_html', () => {
  it('mirrors inline raw_html when rendered_html and rendered_html_path are both absent', () => {
    const snapshot = loadSnapshot(project('inline', NO_HTML), {
      capture: { pages: [{ url: '/', raw_html: '<html><body>raw only</body></html>' }] },
    });
    const [page] = snapshot.pages;
    assert.equal(page.raw_html, '<html><body>raw only</body></html>');
    assert.equal(page.rendered_html, page.raw_html);
  });

  it('mirrors file-backed raw_html when rendered_html_path is omitted', () => {
    const root = project('paths', { ...NO_HTML, 'captures/home.raw': '<html><body>from disk</body></html>' });
    const snapshot = loadSnapshot(root, {
      capture: { pages: [{ url: '/', raw_html_path: 'captures/home.raw' }] },
    });
    const [page] = snapshot.pages;
    assert.equal(page.raw_html, '<html><body>from disk</body></html>');
    assert.equal(page.rendered_html, page.raw_html);
    assert.equal(page.source_file, 'captures/home.raw');
  });

  it('keeps raw and rendered distinct when the capture supplies both', () => {
    const snapshot = loadSnapshot(project('both', NO_HTML), {
      capture: {
        pages: [{ url: '/', raw_html: '<div id="root"></div>', rendered_html: '<div id="root"><h1>Hydrated</h1></div>' }],
      },
    });
    const [page] = snapshot.pages;
    assert.notEqual(page.rendered_html, page.raw_html);
    assert.equal(page.rendered_html, '<div id="root"><h1>Hydrated</h1></div>');
  });

  it('does not fabricate HTML when the declared raw_html_path does not exist', () => {
    const snapshot = loadSnapshot(project('missing-path', NO_HTML), {
      capture: { pages: [{ url: '/', raw_html_path: 'captures/absent.html' }] },
    });
    const [page] = snapshot.pages;
    assert.equal(page.raw_html, null);
    assert.equal(page.rendered_html, null);
  });
});

describe('capture page defaults', () => {
  it('defaults indexable to true when the capture does not mention it', () => {
    const snapshot = loadSnapshot(project('indexable-default', NO_HTML), {
      capture: { pages: [{ url: '/', raw_html: '<html></html>' }] },
    });
    assert.equal(snapshot.pages[0].indexable, true);
  });

  it('honours an explicit indexable: false', () => {
    const snapshot = loadSnapshot(project('indexable-false', NO_HTML), {
      capture: {
        pages: [
          { url: '/', raw_html: '<html></html>' },
          { url: '/private', raw_html: '<html></html>', indexable: false },
        ],
      },
    });
    assert.deepEqual(
      snapshot.pages.map((page) => [page.url, page.indexable]),
      [
        ['/', true],
        ['/private', false],
      ],
    );
  });

  it('defaults status, redirect_chain, headers, and source_file rather than leaving them undefined', () => {
    const snapshot = loadSnapshot(project('defaults', NO_HTML), {
      capture: { pages: [{ url: '/', raw_html: '<html></html>' }] },
    });
    const [page] = snapshot.pages;
    assert.equal(page.status, null);
    assert.deepEqual(page.redirect_chain, []);
    assert.deepEqual(page.headers, {});
    assert.equal(page.source_file, null);
    assert.equal(page.origin, 'capture');
  });

  it('discards a non-array redirect_chain instead of passing it through', () => {
    const snapshot = loadSnapshot(project('redirects', NO_HTML), {
      capture: { pages: [{ url: '/', raw_html: '<html></html>', redirect_chain: 'nonsense' }] },
    });
    assert.deepEqual(snapshot.pages[0].redirect_chain, []);
  });
});

describe('headers are lower-cased', () => {
  it('lower-cases every header name', () => {
    const snapshot = loadSnapshot(project('headers', NO_HTML), {
      capture: {
        pages: [
          {
            url: '/',
            raw_html: '<html></html>',
            headers: { 'Content-Type': 'text/html', 'X-Robots-Tag': 'noindex', CACHE_CONTROL: 'no-store' },
          },
        ],
      },
    });
    assert.deepEqual(snapshot.pages[0].headers, {
      'content-type': 'text/html',
      'x-robots-tag': 'noindex',
      cache_control: 'no-store',
    });
  });

  it('stringifies header values so a check never has to type-guard them', () => {
    const snapshot = loadSnapshot(project('header-values', NO_HTML), {
      capture: { pages: [{ url: '/', raw_html: '<html></html>', headers: { Age: 5 } }] },
    });
    assert.deepEqual(snapshot.pages[0].headers, { age: '5' });
  });
});

describe('a directory with no snapshot.json synthesises pages from .html files', () => {
  const STATIC_SITE = {
    'index.html': '<!doctype html><html><head><title>Home page</title></head><body>Home</body></html>\n',
    'about.html': '<!doctype html><html><head><title>About page</title></head><body>About</body></html>\n',
    'blog/index.html': '<!doctype html><html><head><title>Blog index</title></head><body>Blog</body></html>\n',
    'blog/first-post.html': '<!doctype html><html><head><title>First post</title></head><body>Post</body></html>\n',
    'captures/recorded.html': '<!doctype html><html><body>a previous capture</body></html>\n',
    'snapshots/recorded.html': '<!doctype html><html><body>a previous snapshot</body></html>\n',
    'node_modules/some-pkg/demo.html': '<!doctype html><html><body>vendor demo</body></html>\n',
  };

  it('derives one page per .html file with the trailing index and extension stripped', () => {
    const snapshot = loadSnapshot(project('static', STATIC_SITE));
    assert.deepEqual(snapshot.pages.map((page) => page.url).sort(), ['/', '/about', '/blog', '/blog/first-post']);
    assert.equal(snapshot.captureOrigin, 'static-file');
    assert.equal(snapshot.hasRuntime, true);
    assert.deepEqual([...new Set(snapshot.pages.map((page) => page.origin))], ['static-file']);
  });

  it('skips captures/, snapshots/, and node_modules/', () => {
    const snapshot = loadSnapshot(project('static-skips', STATIC_SITE));
    for (const page of snapshot.pages) {
      assert.ok(!/^(captures|snapshots|node_modules)\//.test(page.source_file), `leaked ${page.source_file}`);
      assert.ok(!page.raw_html.includes('previous capture'));
      assert.ok(!page.raw_html.includes('previous snapshot'));
      assert.ok(!page.raw_html.includes('vendor demo'));
    }
    assert.equal(snapshot.pages.length, 4);
  });

  it('marks synthesised pages indexable with status 200 and no runtime headers', () => {
    const snapshot = loadSnapshot(project('static-fields', { 'index.html': '<!doctype html><html>Hi</html>\n' }));
    const [page] = snapshot.pages;
    assert.equal(page.status, 200);
    assert.equal(page.indexable, true);
    assert.deepEqual(page.headers, {});
    assert.deepEqual(page.redirect_chain, []);
    assert.equal(page.rendered_html, page.raw_html);
    assert.equal(page.source_file, 'index.html');
  });

  it('reports no capture provenance for a source-only directory', () => {
    const snapshot = loadSnapshot(project('static-provenance', { 'index.html': '<html>Hi</html>\n' }));
    assert.equal(snapshot.capturedAt, null);
    assert.equal(snapshot.origin, null);
    assert.equal(snapshot.captureOrigin, 'static-file');
  });

  it('prefers the captured pages and stops synthesising once a capture exists', () => {
    const snapshot = loadSnapshot(project('capture-wins', { 'index.html': '<html>source</html>\n' }), {
      capture: { pages: [{ url: '/served', raw_html: '<html>served</html>' }] },
    });
    assert.deepEqual(snapshot.pages.map((page) => page.url), ['/served']);
    assert.deepEqual([...new Set(snapshot.pages.map((page) => page.origin))], ['capture']);
    assert.equal(snapshot.captureOrigin, 'capture');
  });

  it('reads a snapshot.json off disk when no capture is supplied', () => {
    const root = project('capture-file', {
      ...NO_HTML,
      [CAPTURE_FILENAME]: JSON.stringify({
        captured_at: '2020-01-01T00:00:00.000Z',
        origin: 'https://example.test',
        pages: [{ url: '/', raw_html: '<html>served</html>', headers: { 'X-Robots-Tag': 'all' } }],
      }),
    });
    const snapshot = loadSnapshot(root);
    assert.equal(snapshot.captureOrigin, 'capture');
    assert.equal(snapshot.capturedAt, '2020-01-01T00:00:00.000Z');
    assert.equal(snapshot.origin, 'https://example.test');
    assert.deepEqual(snapshot.pages[0].headers, { 'x-robots-tag': 'all' });
    assert.equal(snapshot.hasRuntime, true);
  });
});

describe('hasRuntime is false when there is nothing to read runtime facts from', () => {
  it('is false for a capture that declares zero pages', () => {
    const snapshot = loadSnapshot(project('zero-pages', NO_HTML), { capture: { pages: [] } });
    assert.deepEqual(snapshot.pages, []);
    assert.equal(snapshot.hasRuntime, false);
    // The capture file still exists, so its provenance is reported honestly.
    assert.equal(snapshot.captureOrigin, 'capture');
  });

  it('is false for a capture file on disk that declares zero pages', () => {
    const root = project('zero-pages-file', { ...NO_HTML, [CAPTURE_FILENAME]: JSON.stringify({ pages: [] }) });
    const snapshot = loadSnapshot(root);
    assert.equal(snapshot.hasRuntime, false);
    assert.equal(snapshot.captureOrigin, 'capture');
  });

  it('is false for a capture that omits the pages key entirely', () => {
    const snapshot = loadSnapshot(project('no-pages-key', NO_HTML), { capture: { captured_at: 'x' } });
    assert.equal(snapshot.hasRuntime, false);
  });

  it('is false for a source-only directory with no HTML to derive pages from', () => {
    const snapshot = loadSnapshot(project('no-html', NO_HTML));
    assert.equal(snapshot.hasRuntime, false);
    assert.equal(snapshot.captureOrigin, null);
  });
});

describe('protocol files resolve shallowest-first', () => {
  it('prefers the host-root robots.txt over a nested copy', () => {
    const root = project('robots-depth', {
      'robots.txt': 'User-agent: *\nAllow: /\n',
      'apps/web/public/robots.txt': 'User-agent: *\nDisallow: /\n',
    });
    const snapshot = loadSnapshot(root);
    assert.equal(snapshot.robots_txt.path, 'robots.txt');
    assert.equal(snapshot.robots_txt.text, 'User-agent: *\nAllow: /\n');
  });

  it('prefers the host-root llms.txt over a nested copy', () => {
    const root = project('llms-depth', {
      'llms.txt': '# root guidance\n',
      'apps/web/public/llms.txt': '# nested guidance\n',
      'apps/docs/public/llms.txt': '# other nested guidance\n',
    });
    const snapshot = loadSnapshot(root);
    assert.equal(snapshot.llms_txt.path, 'llms.txt');
    assert.equal(snapshot.llms_txt.text, '# root guidance\n');
  });

  it('still finds a nested-only protocol file, at any depth', () => {
    const root = project('nested-only', { 'apps/web/public/robots.txt': 'User-agent: *\n' });
    const snapshot = loadSnapshot(root);
    assert.equal(snapshot.robots_txt.path, 'apps/web/public/robots.txt');
  });

  it('breaks a depth tie deterministically, by path', () => {
    const root = project('tie', {
      'zeta/robots.txt': 'zeta\n',
      'alpha/robots.txt': 'alpha\n',
    });
    const snapshot = loadSnapshot(root);
    assert.equal(snapshot.robots_txt.path, 'alpha/robots.txt');
    assert.equal(snapshot.robots_txt.text, 'alpha\n');
  });

  it('reports null rather than an empty resource when no protocol file exists', () => {
    const snapshot = loadSnapshot(project('no-protocol', NO_HTML));
    assert.equal(snapshot.robots_txt, null);
    assert.equal(snapshot.llms_txt, null);
    assert.deepEqual(snapshot.sitemaps, []);
    assert.deepEqual(snapshot.feeds, []);
    assert.deepEqual(snapshot.documents, []);
  });

  it('collects every sitemap and feed rather than only the shallowest', () => {
    const root = project('collections', {
      'sitemap.xml': '<urlset></urlset>\n',
      'public/sitemap-posts.xml': '<urlset></urlset>\n',
      'feed.xml': '<feed></feed>\n',
    });
    const snapshot = loadSnapshot(root);
    assert.deepEqual(snapshot.sitemaps.map((s) => s.path).sort(), ['public/sitemap-posts.xml', 'sitemap.xml']);
    assert.deepEqual(snapshot.feeds.map((f) => f.path), ['feed.xml']);
  });
});
