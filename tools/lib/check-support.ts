/**
 * Shared primitives for check modules.
 *
 * This lives outside `checks/` on purpose: `loadChecks` imports every .ts in
 * that directory and expects a default-exported check, so a helper placed there
 * would be logged as a broken check.
 *
 * The point of this module is that the traps live in one place. Checks that use
 * `pageCheck` cannot forget to gate on runtime evidence; checks that use
 * `location` cannot emit a finding a benchmark case is unable to address; checks
 * that use `robotsGroups` cannot disagree with each other about what a robots.txt
 * group is.
 */
import { finding } from './snapshot.ts';
import type { EvidenceItem } from './snapshot.ts';
import { findTags, parseAttributes } from './html.ts';

/* ------------------------------------------------------------- locations */

/**
 * Neutralise comments without moving anything.
 *
 * `stripComments` deletes the comment, which shifts every offset after it and
 * makes the reported line number wrong for any document that has one. Overwriting
 * the comment with spaces of the same length - newlines kept - leaves offsets and
 * line numbers identical to the original file while still hiding commented-out
 * markup from the tag scanner.
 */
export function blankComments(html) {
  return String(html ?? '').replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
}

/** 1-based line number for a character offset. */
export function lineAt(text, index) {
  if (typeof index !== 'number' || index < 0) return null;
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text[i] === '\n') line += 1;
  return line;
}

/**
 * Where a finding is.
 *
 * Benchmark cases match locations by suffix, so a location must name a real
 * file where one exists. A page derived from a capture may have no source file,
 * in which case its URL is the only honest address.
 *
 * A line number is attached only when the bytes the checks scanned are the bytes
 * of the source file. Checks read `rendered_html ?? raw_html`, so once a capture
 * supplies a separate rendered document the offsets address that document and not
 * the file on disk - pointing them at a line of the source would be precise and
 * wrong. In that case the file is named without a line.
 */
export function location(page, index = null) {
  const base = page.source_file || page.url || '(unknown)';
  if (index === null || !page.source_file) return base;
  if (page.raw_html !== page.rendered_html) return base;
  const line = lineAt(page.raw_html ?? page.rendered_html ?? '', index);
  return line ? `${base}:${line}` : base;
}

/**
 * One evidence item. `type` must be declared by the bound requirement.
 *
 * The detail object is spread over the type, so a detail key named `type` used to
 * overwrite the evidence type silently - a check reporting a schema.org type as
 * `{ type: 'Organization' }` emitted an item the evidence validator rejected as
 * an undeclared evidence type, and the check looked wrong when only the key name
 * was. Refusing the key makes that a loud programming error instead of a
 * plausible-looking one. Name the detail `node_type`, `entity_type`, or whatever
 * the value actually is.
 */
export function ev(type: string, detail: Record<string, unknown> = {}): EvidenceItem {
  if (Object.hasOwn(detail, 'type')) {
    throw new Error(`ev(${JSON.stringify(type)}) was given a detail key named "type", which would overwrite the evidence type; rename it`);
  }
  return { type, ...detail };
}

/* --------------------------------------------------------------- gating */

/**
 * The runtime gate, as a value.
 *
 * Returns a finished NEEDS_RUNTIME result when there is nothing served to read,
 * or null when the check may proceed. Cross-page checks that cannot use
 * `pageCheck` call this first so the gate is never re-implemented by hand.
 *
 * `pages.length === 0` is the only honest trigger: a capture file declaring no
 * pages carries no runtime evidence, and returning an empty finding list there
 * would be indistinguishable from a pass.
 */
export function gate(snapshot) {
  if (snapshot.pages.length) return null;
  return {
    status: 'NEEDS_RUNTIME',
    findings: [],
    detail: 'no pages available; add snapshot.json or run against a served origin',
  };
}

/**
 * Run a per-page check, gating on runtime evidence first.
 *
 * Source files are not evidence of served output, so a check with nothing to
 * read reports NEEDS_RUNTIME rather than passing.
 */
export function pageCheck(check, snapshot, perPage, { indexableOnly = false } = {}) {
  const blocked = gate(snapshot);
  if (blocked) return blocked;
  const pages = indexableOnly ? snapshot.pages.filter((p) => p.indexable !== false) : snapshot.pages;
  if (!pages.length) return { status: 'NOT_APPLICABLE', findings: [], detail: 'no indexable pages' };

  const findings = [];
  for (const page of pages) {
    const html = page.rendered_html ?? page.raw_html;
    if (!html) continue;
    for (const item of perPage(page, html) || []) {
      findings.push(finding({ check_id: check.id, ...item }));
    }
  }
  return { status: findings.length ? 'FAIL' : 'PASS', findings };
}

/** Run a check over one text resource, or report NOT_APPLICABLE when absent. */
export function resourceCheck(check, resource, inspect) {
  if (!resource || !resource.text) {
    return { status: 'NOT_APPLICABLE', findings: [], detail: 'resource not present in this project' };
  }
  const findings = (inspect(resource.text, resource.path) || []).map((item) => finding({ check_id: check.id, ...item }));
  return { status: findings.length ? 'FAIL' : 'PASS', findings };
}

/* ------------------------------------------------------- head-safe reads */

/**
 * Link elements with a given rel, taken from the whole document.
 *
 * This helper keeps whole-document and head-scoped reads distinct, so checks
 * can report a canonical or other link that was emitted outside <head>.
 */
export function linkTags(html, rel) {
  const target = String(rel).toLowerCase();
  return findTags(blankComments(html), 'link')
    .filter((tag) => (tag.attrs.rel || '').toLowerCase().split(/\s+/).includes(target));
}

/** True when the document has a real <head> element. */
export function hasHead(html) {
  return /<head[\s>]/i.test(blankComments(html));
}

/**
 * Link elements with a given rel that sit inside <head>.
 *
 * Offsets are document-absolute, matching `linkTags`, so a caller can subtract
 * one set from the other to find the elements that are outside <head>.
 */
export function headLinkTags(html, rel) {
  const target = String(rel).toLowerCase();
  const scope = hasHead(html) ? headTags(html, 'link') : findTags(blankComments(html), 'link');
  return scope.filter((tag) => (tag.attrs.rel || '').toLowerCase().split(/\s+/).includes(target));
}

/** Meta elements from the whole document, not just <head>. */
export function metaTagsAnywhere(html) {
  return findTags(blankComments(html), 'meta').map((tag) => ({ attrs: tag.attrs, index: tag.index }));
}

/**
 * Meta elements inside <head>, with offsets relative to the whole document.
 *
 * `headOf` returns a substring, so offsets taken from it would point at the
 * wrong line. The offset of <head>'s inner content is added back here so a
 * finding's line number addresses the real file.
 */
export function headMetaTags(html) {
  if (!hasHead(html)) return metaTagsAnywhere(html);
  const clean = blankComments(html);
  const head = findTags(clean, 'head')[0];
  if (!head) return metaTagsAnywhere(html);
  const offset = head.index + head.raw.length;
  return findTags(head.inner, 'meta').map((tag) => ({ attrs: tag.attrs, index: tag.index + offset }));
}

/** Named tags inside <head>, with document-relative offsets. */
export function headTags(html, tagName) {
  const clean = blankComments(html);
  const head = findTags(clean, 'head')[0];
  if (!head) return findTags(clean, tagName);
  const offset = head.index + head.raw.length;
  return findTags(head.inner, tagName).map((tag) => ({ ...tag, index: tag.index + offset }));
}

/**
 * JSON-LD script blocks, each with its parse result and its real offset. The
 * type match is deliberately exact: a crawler
 * only reads `application/ld+json`, so a misspelled type is a separate defect
 * rather than a block to be parsed leniently here.
 */
export function jsonLdScripts(html) {
  const out = [];
  for (const tag of findTags(blankComments(html), 'script')) {
    if ((tag.attrs.type || '').trim().toLowerCase() !== 'application/ld+json') continue;
    const raw = tag.inner.trim();
    try {
      out.push({ raw, value: JSON.parse(raw), error: null, index: tag.index });
    } catch (error) {
      out.push({ raw, value: null, error: error.message, index: tag.index });
    }
  }
  return out;
}

/** Stamp `check_id` onto every finding a cross-page check builds by hand. */
export function findingsFor(check, items) {
  const list = (items || []).map((item) => finding({ check_id: check.id, ...item }));
  return { status: list.length ? 'FAIL' : 'PASS', findings: list };
}

/* --------------------------------------------------------- indexability */

const ROBOTS_TOKEN = /(^|[\s,])(noindex|none)([\s,]|$)/i;

/** Robots directives a page declares, from meta robots and X-Robots-Tag. */
export function robotsDirectives(page) {
  const html = page.rendered_html ?? page.raw_html ?? '';
  const metas = metaTagsAnywhere(html)
    .filter(({ attrs }) => /^(robots|googlebot|bingbot)$/i.test(attrs.name || ''))
    .map(({ attrs, index }) => ({ source: `meta name="${attrs.name}"`, value: attrs.content || '', index }));
  const header = page.headers?.['x-robots-tag'];
  if (header) metas.push({ source: 'X-Robots-Tag', value: header, index: null });
  return metas;
}

/** True when a page asks not to be indexed. */
export function declaresNoindex(page) {
  return robotsDirectives(page).some((d) => ROBOTS_TOKEN.test(d.value));
}

/* --------------------------------------------------------- robots.txt */

/**
 * Parse robots.txt into groups.
 *
 * A group is one or more consecutive User-agent lines plus the directives that
 * follow. Directives appearing before any User-agent line belong to no group,
 * which is itself worth reporting, so they are returned under `preamble`.
 */
export function robotsGroups(text) {
  const groups = [];
  const preamble = [];
  const other = [];
  let current = null;
  let expectingAgents = false;

  String(text ?? '').split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!match) return;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    const entry = { field, value, line: i + 1, raw: line };

    if (field === 'user-agent') {
      if (!current || !expectingAgents) {
        current = { agents: [], rules: [], line: i + 1 };
        groups.push(current);
      }
      current.agents.push(value);
      expectingAgents = true;
      return;
    }
    expectingAgents = false;
    if (field === 'allow' || field === 'disallow' || field === 'crawl-delay') {
      if (current) current.rules.push(entry);
      else preamble.push(entry);
      return;
    }
    other.push(entry);
  });

  return { groups, preamble, other };
}

/** Sitemap URLs declared in robots.txt. */
export function robotsSitemaps(text) {
  return robotsGroups(text).other.filter((e) => e.field === 'sitemap').map((e) => e.value);
}

/* ----------------------------------------------------------- sitemaps */

/** `<loc>` values in a sitemap or sitemap index, with line numbers. */
export function sitemapLocations(xml) {
  const text = String(xml ?? '');
  return findTags(text, 'loc').map((tag) => ({
    value: tag.inner.trim(),
    line: lineAt(text, tag.index),
  }));
}

/** Which sitemap document this is, or null when it is neither. */
export function sitemapKind(xml) {
  if (/<sitemapindex[\s>]/i.test(xml)) return 'index';
  if (/<urlset[\s>]/i.test(xml)) return 'urlset';
  return null;
}

/* --------------------------------------------------------------- urls */

/** Path portion of a URL or href, without query or fragment. */
export function pathOf(value) {
  const raw = String(value ?? '');
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname;
    } catch {
      return null;
    }
  }
  if (!raw.startsWith('/')) return null;
  return raw.split(/[?#]/)[0];
}

/** Host portion of an absolute URL, or null. */
export function hostOf(value) {
  try {
    return new URL(String(value)).host;
  } catch {
    return null;
  }
}

/**
 * Compare two URLs ignoring a trailing slash and the fragment.
 *
 * The empty result is rejected on purpose: two absent values are not a match, and
 * returning true for them would make a missing og:url agree with a missing
 * canonical. Trimming the trailing slash before that test, however, collapsed the
 * root path to the empty string, so `sameUrl('/', '/')` was false and
 * og-url-matches-canonical reported "og:url is / but the canonical is /; the two
 * name different documents" about one document. `/` addresses a page and `''`
 * addresses nothing, so the trim is undone when it consumes the whole value.
 */
export function sameUrl(a, b) {
  const norm = (v) => {
    const base = String(v ?? '').split('#')[0];
    return base.replace(/\/$/, '') || base;
  };
  const left = norm(a);
  return left === norm(b) && left !== '';
}

export { finding, parseAttributes };
