import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { robotsDirectives } from './check-support.ts';
import { CAPTURE_FILENAME } from './snapshot.ts';

/**
 * Capture runtime facts from a served origin.
 *
 * Every RUNTIME-level check in this package reads what a crawler received, not
 * what the repository says it renders. Until a capture exists there is nothing to
 * read, and the checks honestly report NEEDS_RUNTIME rather than guessing from
 * source. This module is how a capture gets made, so the skill can be pointed at a
 * real site instead of only at its own fixtures.
 *
 * Deliberate scope, stated so nobody mistakes this for a crawler:
 *
 *   - No headless browser. A fetch-only capture records the bytes the server
 *     returned, and `pageFromCapture` falls back `rendered_html -> raw_html`, so
 *     every check that reads served markup works against it. Only checks that
 *     genuinely need post-hydration DOM report a smaller document than reality,
 *     which is visible in the report rather than hidden.
 *   - No robots.txt obedience. An audit tool that refuses to fetch a page it is
 *     being asked to audit cannot audit it. This reads only what the caller names
 *     and what those pages link to, and writes nothing to the origin.
 *   - Same-origin only. Following an off-site href would put another operator's
 *     server in the report.
 *
 * `redirect: 'manual'` is the load-bearing choice. Node's fetch hands back the real
 * 3xx response with a readable `location`, so the chain is observed rather than
 * inferred from `response.redirected`, which only reports that a redirect happened
 * and not how long the path to it was.
 */

export interface CapturePage {
  url: string;
  status: number | null;
  headers: Record<string, string>;
  redirect_chain: string[];
  raw_html_path: string;
  source_file: string | null;
  indexable: boolean;
  error?: string;
}

export interface CaptureResult {
  origin: string;
  captured_at: string;
  pages: CapturePage[];
  errors: { url: string; error: string }[];
  /**
   * Response bodies keyed by `page.url`. Held beside the result rather than inside
   * `pages` so the result is safe to print: the pages carry paths, not megabytes.
   */
  bodies: Map<string, string>;
}

export interface CaptureOptions {
  timeoutMs?: number;
  concurrency?: number;
  maxPages?: number;
  maxRedirects?: number;
  /** A sitemap URL or local sitemap file to seed the walk with every `<loc>`. */
  sitemap?: string;
  /** Overridden in tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/** Schemes that address something other than an HTTP page. */
const NON_PAGE_SCHEME = /^(?:mailto|tel|sms|javascript|data|blob|ftp|ftps|file|ws|wss|news|magnet|intent):/i;

/**
 * Collapse the ways one page can be written onto a single key, so `/about`,
 * `/about/`, and `/about.html` are one destination rather than three.
 */
function pathKey(url: URL): string {
  let path = url.pathname.replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

function absolute(base: string, href: string): URL | null {
  const raw = String(href ?? '').trim();
  if (!raw || raw.startsWith('#') || NON_PAGE_SCHEME.test(raw)) return null;
  try {
    return new URL(raw.startsWith('//') ? `https:${raw}` : raw, base);
  } catch {
    return null;
  }
}

/** Same-origin page hrefs in a document, as absolute URLs. */
function internalLinks(html: string, pageUrl: URL, origin: URL): URL[] {
  const out: URL[] = [];
  const seen = new Set();
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/gi)) {
    const href = match[1] ?? match[2] ?? match[3];
    const url = absolute(pageUrl.href, href);
    if (!url || url.origin !== origin.origin) continue;
    if (!/^https?:$/i.test(url.protocol)) continue;
    const key = pathKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

/** True when the served document asks not to be indexed. */
function declaresNoindex(html: string): boolean {
  return robotsDirectives({ rendered_html: html, raw_html: html, headers: {} }).some((d) =>
    /(^|[\s,])(noindex|none)([\s,]|$)/i.test(d.value),
  );
}

// ponytail: `redirect_chain` records the requests that redirected, not the address
// each one landed on, so the destination of a multi-hop chain is not in the capture.
// Ceiling: a finding can say how many hops a URL took but not where it ended.
// Upgrade if a check ever needs the landing address: add `redirects_to` to
// SnapshotPage rather than overloading the chain.
/**
 * One request, following redirects by hand so the chain is recorded.
 *
 * The loop bound is what makes this terminate: a redirect cycle is a real defect
 * this repository has a requirement for, and hitting the bound is how it becomes
 * observable instead of an unbounded fetch.
 */
async function fetchPage(url: URL, opts: ResolvedOptions): Promise<{
  status: number | null;
  headers: Record<string, string>;
  chain: string[];
  html: string | null;
  error?: string;
}> {
  const doFetch = opts.fetchImpl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const chain: string[] = [];
  let current = url;

  try {
    for (let hop = 0; hop <= opts.maxRedirects; hop += 1) {
      const response = await doFetch(current.href, { redirect: 'manual', signal: controller.signal });
      const next = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && next) {
        chain.push(current.href);
        const target = absolute(current.href, next);
        if (!target) return { status: response.status, headers: {}, chain, html: null, error: `unresolvable Location: ${next}` };
        current = target;
        continue;
      }
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      // Only markup is kept. A JSON or binary response still becomes a page
      // record, because its status, headers, and redirect chain are exactly the
      // runtime facts the URL and canonical checks need.
      const type = headers['content-type'] ?? '';
      const html = /x?html|text\/plain|\+xml/i.test(type) || !type ? await response.text() : '';
      return { status: response.status, headers, chain, html };
    }
    return { status: null, headers: {}, chain, html: null, error: `more than ${opts.maxRedirects} redirects` };
  } catch (error) {
    return { status: null, headers: {}, chain, html: null, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/** `<loc>` values from a sitemap or sitemap index. */
function sitemapLocations(xml: string): string[] {
  return [...String(xml ?? '').matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

/** Read seed paths from a sitemap URL or a sitemap file on disk. */
async function seedsFromSitemap(sitemap: string, origin: URL, opts: ResolvedOptions): Promise<URL[]> {
  const remote = /^https?:\/\//i.test(sitemap);
  const xml = remote
    ? (await fetchPage(new URL(sitemap), opts)).html ?? ''
    : readFileSync(sitemap, 'utf8');
  const out: URL[] = [];
  for (const loc of sitemapLocations(xml)) {
    const url = absolute(origin.href, loc);
    if (url && url.origin === origin.origin) out.push(url);
  }
  return out;
}

/**
 * Walk the site breadth-first from a set of seeds.
 *
 * Same-origin anchors are followed because enumerating the URLs is the part no
 * caller can do by hand for a real site; `--max-pages` bounds it so the walk is a
 * sample with a stated size, never an unbounded crawl.
 */
/** `CaptureOptions` with every field resolved. `sitemap` stays optional: it is read once. */
type ResolvedOptions = Required<Omit<CaptureOptions, 'sitemap'>> & { sitemap?: string };

export async function captureSite(originInput: string, paths: string[] = [], opts: CaptureOptions = {}): Promise<CaptureResult> {
  const origin = new URL(/^https?:\/\//i.test(originInput) ? originInput : `https://${originInput}`);
  const options: ResolvedOptions = {
    timeoutMs: opts.timeoutMs ?? 15000,
    concurrency: opts.concurrency ?? 4,
    maxPages: opts.maxPages ?? 50,
    maxRedirects: opts.maxRedirects ?? 5,
    fetchImpl: opts.fetchImpl ?? fetch,
    sitemap: opts.sitemap,
  };

  const seeds = [origin, ...paths.map((p) => absolute(origin.href, p)).filter(Boolean)];
  if (opts.sitemap) seeds.push(...(await seedsFromSitemap(opts.sitemap, origin, options)));
  const seeded = new Set(seeds.map(pathKey));
  const queued = new Map<string, URL>();
  for (const seed of seeds) queued.set(pathKey(seed), seed);

  const pages: CapturePage[] = [];
  const errors: { url: string; error: string }[] = [];
  const bodies = new Map<string, string>();
  /** Path keys already fetched or queued, so `/` and `/index.html` cost one request. */
  const seen = new Set<string>(seeded);

  while (queued.size && pages.length < options.maxPages) {
    const batch = [...queued.entries()].slice(0, Math.max(Math.min(options.concurrency, options.maxPages - pages.length), 1));
    for (const [key] of batch) queued.delete(key);

    const results = await Promise.all(
      batch.map(async ([, url]) => ({ url, result: await fetchPage(url, options) })),
    );

    for (const { url, result } of results) {
      if (result.error) {
        errors.push({ url: url.href, error: result.error });
        continue;
      }
      if (result.html) bodies.set(url.href, result.html);
      pages.push({
        // The address that was requested, not where it landed: a redirect is a
        // finding about the requested URL, and reporting the destination instead
        // would hide it.
        url: url.href,
        status: result.status,
        headers: result.headers,
        redirect_chain: result.chain,
        raw_html_path: '',
        source_file: null,
        indexable: !declaresNoindex(result.html),
      });
      if (pages.length + queued.size < options.maxPages) {
        for (const link of internalLinks(result.html, url, origin)) {
          const linkKey = pathKey(link);
          if (seen.has(linkKey)) continue;
          seen.add(linkKey);
          queued.set(linkKey, link);
        }
      }
    }
  }

  return { origin: origin.href, captured_at: new Date().toISOString(), pages, errors, bodies };
}

/**
 * Write the capture where `loadSnapshot` looks for it.
 *
 * HTML goes to `captures/*.html` and the page keeps a path rather than the bytes,
 * which is the same shape the benchmark fixtures use and the reason a 50-page
 * capture does not become a multi-megabyte JSON file. The filename is derived from
 * the path so it is stable across runs and diffable in git.
 */
export function writeCapture(result: CaptureResult, outDir: string): string {
  const capturesDir = join(outDir, 'captures');
  mkdirSync(capturesDir, { recursive: true });

  for (const page of result.pages) {
    // A response with no markup has no file to point a finding at; leaving the
    // paths empty makes `location()` report the URL, which is the honest address.
    if (!result.bodies.has(page.url)) continue;
    const slug = page.url
      .replace(/^https?:\/\//i, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'index';
    page.raw_html_path = `captures/${slug}.html`;
    page.source_file = page.raw_html_path;
    writeFileSync(join(outDir, page.raw_html_path), result.bodies.get(page.url) ?? '');
  }

  const path = join(outDir, CAPTURE_FILENAME);
  writeFileSync(
    path,
    `${JSON.stringify({ origin: result.origin, captured_at: result.captured_at, pages: result.pages }, null, 2)}\n`,
  );
  return path;
}