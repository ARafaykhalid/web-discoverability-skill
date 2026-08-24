/**
 * Sitemap checks.
 *
 * A sitemap is a discovery hint, not an indexing instruction, so the defects worth
 * reporting are the ones that make it unreadable or make it disagree with the rest
 * of the site's signals. Nothing here treats inclusion in a sitemap as a promise
 * that a URL will be indexed.
 */
import { isAbsoluteUrl } from '../html.mjs';
import {
  gate, findingsFor, ev, linkTags, sitemapLocations, sitemapKind,
  robotsGroups, declaresNoindex, robotsDirectives, pathOf, hostOf, lineAt,
} from '../check-support.mjs';
import { decideForPath } from './robots.mjs';

/** Protocol limits: 50,000 URLs and 50 MiB uncompressed, per file. */
const MAX_ENTRIES = 50000;
const MAX_BYTES = 50 * 1024 * 1024;

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

/** Tags that may legitimately appear without a closing tag being paired here. */
const SELF_CLOSING = /\/>$/;

/**
 * Minimal well-formedness scan.
 *
 * A real XML parser is not available without a dependency, and the failures that
 * actually break a sitemap are structural rather than exotic: unbalanced tags and
 * bare ampersands. Both are detected here directly; anything subtler is left to
 * VALIDATOR_OUTPUT evidence from an external validator.
 */
function wellFormednessProblems(xml) {
  const problems = [];
  const text = String(xml ?? '');

  const stack = [];
  const tagPattern = /<(\/?)([A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let match;
  while ((match = tagPattern.exec(text))) {
    const [raw, closing, name] = match;
    if (raw.startsWith('<?') || raw.startsWith('<!')) continue;
    if (closing) {
      const open = stack.pop();
      if (!open) {
        problems.push({ line: lineAt(text, match.index), detail: `closing tag </${name}> has no matching open tag` });
      } else if (open.name !== name) {
        problems.push({ line: lineAt(text, match.index), detail: `</${name}> closes <${open.name}> opened at line ${open.line}` });
      }
      continue;
    }
    if (SELF_CLOSING.test(raw)) continue;
    stack.push({ name, line: lineAt(text, match.index) });
  }
  for (const open of stack) {
    problems.push({ line: open.line, detail: `<${open.name}> is never closed` });
  }

  // A bare `&` is the single most common way a generated sitemap becomes
  // unparseable, because query strings are pasted in without escaping.
  const amp = /&(?!(?:[A-Za-z][A-Za-z0-9]*|#\d+|#[xX][0-9a-fA-F]+);)/g;
  while ((match = amp.exec(text))) {
    problems.push({
      line: lineAt(text, match.index),
      detail: 'bare "&" is not valid XML; it must be written &amp;',
    });
  }

  return problems;
}

const sitemapXmlWellformed = {
  id: 'sitemap-xml-wellformed',
  requirements: ['SEO-113'],
  level: 'SOURCE',
  title: 'Sitemaps are well-formed and use the sitemap namespace',
  run(snapshot) {
    if (!snapshot.sitemaps.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'project ships no sitemap file' };
    }

    const items = [];
    for (const sitemap of snapshot.sitemaps) {
      const xml = sitemap.text || '';
      const kind = sitemapKind(xml);
      const problemEvidence = (note) => [
        ev('SITEMAP', { path: sitemap.path, kind }),
        ev('VALIDATOR_OUTPUT', { rule: 'sitemap-xml-wellformed', note }),
      ];

      if (!kind) {
        items.push({
          requirement_id: 'SEO-113',
          location: sitemap.path,
          severity: 'HIGH',
          detail: 'root element is neither <urlset> nor <sitemapindex>, so the document is not a sitemap',
          evidence: [
            ev('SITEMAP', { path: sitemap.path, observed: xml.slice(0, 200) }),
            ev('HTTP_STATUS', { observed: null, note: 'file present in the repository' }),
          ],
        });
        continue;
      }

      if (!xml.includes(SITEMAP_NS)) {
        items.push({
          requirement_id: 'SEO-113',
          location: sitemap.path,
          severity: 'HIGH',
          detail: `root element does not declare the sitemap namespace ${SITEMAP_NS}`,
          evidence: problemEvidence('missing xmlns declaration'),
        });
      }

      for (const problem of wellFormednessProblems(xml)) {
        items.push({
          requirement_id: 'SEO-113',
          location: `${sitemap.path}:${problem.line}`,
          severity: 'HIGH',
          detail: problem.detail,
          evidence: problemEvidence(problem.detail),
        });
      }

      const container = kind === 'index' ? 'sitemap' : 'url';
      const entries = xml.match(new RegExp(`<${container}[\\s>]`, 'gi')) || [];
      const locs = sitemapLocations(xml);
      if (entries.length && locs.length < entries.length) {
        items.push({
          requirement_id: 'SEO-113',
          location: sitemap.path,
          severity: 'HIGH',
          detail: `${entries.length} <${container}> entries but only ${locs.length} <loc> values; every entry requires exactly one <loc>`,
          evidence: problemEvidence('entry without loc'),
        });
      }
      for (const loc of locs.filter((l) => !l.value)) {
        items.push({
          requirement_id: 'SEO-113',
          location: `${sitemap.path}:${loc.line}`,
          severity: 'HIGH',
          detail: '<loc> is empty',
          evidence: problemEvidence('empty loc'),
        });
      }
    }
    return findingsFor(sitemapXmlWellformed, items);
  },
};

const sitemapLocSameHost = {
  id: 'sitemap-loc-same-host',
  requirements: ['SEO-116'],
  level: 'SOURCE',
  title: 'Sitemap locations are absolute URLs on the sitemap host',
  run(snapshot) {
    if (!snapshot.sitemaps.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'project ships no sitemap file' };
    }

    const items = [];
    for (const sitemap of snapshot.sitemaps) {
      const locs = sitemapLocations(sitemap.text || '');
      if (!locs.length) continue;

      // The declared origin is the authority when one exists. Without it the
      // majority host among the entries is the only available reference, which is
      // enough to find the odd one out but not enough to name the right host - so
      // the finding says the entries disagree rather than which one is wrong.
      const declaredHost = hostOf(snapshot.origin || '');
      const hosts = locs.map((l) => hostOf(l.value)).filter(Boolean);
      const tally = new Map();
      for (const host of hosts) tally.set(host, (tally.get(host) || 0) + 1);
      const majority = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const reference = declaredHost || majority;

      for (const loc of locs) {
        if (!loc.value) continue;
        if (!isAbsoluteUrl(loc.value)) {
          items.push({
            requirement_id: 'SEO-116',
            location: `${sitemap.path}:${loc.line}`,
            severity: 'MEDIUM',
            detail: `<loc>${loc.value}</loc> is not an absolute URL; the sitemap protocol requires the full URL including protocol and host`,
            evidence: [
              ev('SITEMAP', { path: sitemap.path, line: loc.line, observed: loc.value }),
              ev('ROUTE', { path: pathOf(loc.value) }),
            ],
          });
          continue;
        }
        const host = hostOf(loc.value);
        if (!reference || host === reference) continue;
        items.push({
          requirement_id: 'SEO-116',
          location: `${sitemap.path}:${loc.line}`,
          severity: 'MEDIUM',
          detail: declaredHost
            ? `<loc> host ${host} differs from the site origin ${declaredHost}; a sitemap may only list URLs on its own host unless cross-submission is configured`
            : `<loc> host ${host} differs from the ${tally.get(majority)} other entries on ${majority}; the entries in one sitemap disagree about the host`,
          evidence: [
            ev('SITEMAP', { path: sitemap.path, line: loc.line, observed: loc.value, reference_host: reference }),
            ev('HTTP_STATUS', { url: loc.value, observed: null, note: 'not fetched' }),
          ],
        });
      }
    }
    return findingsFor(sitemapLocSameHost, items);
  },
};

const sitemapSizeLimits = {
  id: 'sitemap-size-limits',
  requirements: ['SEO-117'],
  level: 'SOURCE',
  title: 'Each sitemap file stays inside the protocol limits',
  run(snapshot) {
    if (!snapshot.sitemaps.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'project ships no sitemap file' };
    }

    const items = [];
    for (const sitemap of snapshot.sitemaps) {
      const xml = sitemap.text || '';
      const entries = sitemapLocations(xml).length;
      const bytes = Buffer.byteLength(xml, 'utf8');
      // Only a real breach is reported. The observed count and size are attached
      // as evidence either way, so a report can show headroom without this check
      // inventing a warning threshold the protocol does not define.
      const observed = ev('SITEMAP', { path: sitemap.path, entries, bytes, max_entries: MAX_ENTRIES, max_bytes: MAX_BYTES });

      if (entries > MAX_ENTRIES) {
        items.push({
          requirement_id: 'SEO-117',
          location: sitemap.path,
          severity: 'MEDIUM',
          detail: `${entries} URLs exceeds the 50,000-per-file limit; split the file and list the parts in a sitemap index`,
          evidence: [observed, ev('BUILD_OUTPUT', { generated_entries: entries })],
        });
      }
      if (bytes > MAX_BYTES) {
        items.push({
          requirement_id: 'SEO-117',
          location: sitemap.path,
          severity: 'MEDIUM',
          detail: `${bytes} bytes uncompressed exceeds the 50 MiB per-file limit`,
          evidence: [observed, ev('HTTP_HEADER', { 'content-length': bytes, note: 'measured from the file, not from a response' })],
        });
      }
    }
    return findingsFor(sitemapSizeLimits, items);
  },
};

/** Index sitemap locs by path so a page can be matched to its entry. */
function locsByPath(sitemaps) {
  const map = new Map();
  for (const sitemap of sitemaps) {
    for (const loc of sitemapLocations(sitemap.text || '')) {
      const path = pathOf(loc.value);
      if (!path) continue;
      const key = path.replace(/\/$/, '') || '/';
      if (!map.has(key)) map.set(key, { ...loc, sitemap: sitemap.path });
    }
  }
  return map;
}

const sitemapListsNoindexUrl = {
  id: 'sitemap-lists-noindex-url',
  requirements: ['SEO-114'],
  level: 'RUNTIME',
  title: 'Sitemaps do not list URLs the site excludes',
  run(snapshot) {
    if (!snapshot.sitemaps.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'project ships no sitemap file' };
    }
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const listed = locsByPath(snapshot.sitemaps);
    if (!listed.size) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no resolvable sitemap locations to compare' };
    }

    const robots = snapshot.robots_txt;
    const wildcard = robots
      ? robotsGroups(robots.text).groups.filter((g) => g.agents.some((a) => a.trim() === '*'))
      : [];
    const merged = wildcard.length ? { rules: wildcard.flatMap((g) => g.rules) } : null;

    const items = [];
    for (const page of snapshot.pages) {
      const path = (pathOf(page.url) || page.url || '').replace(/\/$/, '') || '/';
      const entry = listed.get(path);
      if (!entry) continue;

      if (declaresNoindex(page)) {
        items.push({
          requirement_id: 'SEO-114',
          location: `${entry.sitemap}:${entry.line}`,
          severity: 'MEDIUM',
          detail: `${entry.value} is listed for crawling but serves a noindex directive; the sitemap is asking for attention to a page the page itself refuses`,
          evidence: [
            ev('SITEMAP', { path: entry.sitemap, line: entry.line, observed: entry.value }),
            ev('HTTP_HEADER', { url: page.url, directives: robotsDirectives(page).map((d) => `${d.source}: ${d.value}`) }),
          ],
        });
        continue;
      }
      if (merged) {
        const { decision, rule } = decideForPath(merged, path);
        if (decision === 'disallow') {
          items.push({
            requirement_id: 'SEO-114',
            location: `${entry.sitemap}:${entry.line}`,
            severity: 'MEDIUM',
            detail: `${entry.value} is listed in the sitemap but disallowed by "${rule.raw}" in robots.txt; the two files give the crawler opposite instructions`,
            evidence: [
              ev('SITEMAP', { path: entry.sitemap, line: entry.line, observed: entry.value }),
              ev('ROBOTS_TXT', { path: robots.path, line: rule.line, observed: rule.raw }),
            ],
          });
        }
      }
    }
    return findingsFor(sitemapListsNoindexUrl, items);
  },
};

const sitemapCanonicalOnly = {
  id: 'sitemap-canonical-only',
  requirements: ['SEO-055'],
  level: 'RUNTIME',
  title: 'Sitemaps list canonical URLs that respond with 200',
  run(snapshot) {
    if (!snapshot.sitemaps.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'project ships no sitemap file' };
    }
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const listed = locsByPath(snapshot.sitemaps);
    if (!listed.size) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no resolvable sitemap locations to compare' };
    }

    const items = [];
    for (const page of snapshot.pages) {
      const path = (pathOf(page.url) || page.url || '').replace(/\/$/, '') || '/';
      const entry = listed.get(path);
      if (!entry) continue;

      if (page.status !== null && page.status !== 200) {
        items.push({
          requirement_id: 'SEO-055',
          location: `${entry.sitemap}:${entry.line}`,
          severity: 'MEDIUM',
          detail: `${entry.value} is listed in the sitemap but responds ${page.status}; a sitemap should list only URLs that serve the content`,
          evidence: [
            ev('SITEMAP', { path: entry.sitemap, line: entry.line, observed: entry.value }),
            ev('HTTP_STATUS', { url: page.url, observed: page.status, redirect_chain: page.redirect_chain }),
          ],
        });
        continue;
      }

      const html = page.rendered_html ?? page.raw_html ?? '';
      const canonical = linkTags(html, 'canonical').map((t) => (t.attrs.href || '').trim()).find(Boolean);
      if (!canonical) continue;
      const canonicalPath = (pathOf(canonical) || '').replace(/\/$/, '') || '/';
      if (!canonicalPath || canonicalPath === path) continue;

      items.push({
        requirement_id: 'SEO-055',
        location: `${entry.sitemap}:${entry.line}`,
        severity: 'MEDIUM',
        detail: `${entry.value} is listed in the sitemap but canonicalises to ${canonical}; listing the non-canonical version asks the crawler to spend budget on a URL the page itself disowns`,
        evidence: [
          ev('SITEMAP', { path: entry.sitemap, line: entry.line, observed: entry.value }),
          ev('RENDERED_HTML', { url: page.url, canonical }),
          ev('HTTP_STATUS', { url: page.url, observed: page.status }),
        ],
      });
    }
    return findingsFor(sitemapCanonicalOnly, items);
  },
};

export default [
  sitemapXmlWellformed,
  sitemapLocSameHost,
  sitemapSizeLimits,
  sitemapListsNoindexUrl,
  sitemapCanonicalOnly,
];
