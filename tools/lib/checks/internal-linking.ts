/**
 * Internal link integrity.
 *
 * The evidence for a link that resolves is a status code, and the only status
 * codes available here are the ones the capture already recorded. That makes this
 * check a graph comparison rather than a crawl: every same-origin href is matched
 * against the pages the capture holds and the HTML files the repository ships,
 * and the recorded status and redirect chain of the matched page are the verdict.
 */
import { anchors, findTags, stripComments } from '../html.ts';
import { pageCheck, gate, findingsFor, location, ev, pathOf, hostOf } from '../check-support.ts';

/**
 * Anchors paired with their offset in the document.
 *
 * `anchors()` normalises href, rel, and link text but drops the offset that
 * `location` needs for a line number. Both lists come from the same
 * `findTags(stripComments(html), 'a')` call in the same order, so pairing them
 * positionally is exact. Anchors cannot legally nest, so `findTags` is safe here
 * in a way it is not for container elements.
 */
function anchorsInOrder(html) {
  const tags = findTags(stripComments(html), 'a');
  return anchors(html).map((link, i) => ({ ...link, index: tags[i]?.index ?? null }));
}

/** Redirect statuses, so a page that redirects is never called unreachable. */
const REDIRECT = new Set([301, 302, 303, 307, 308]);

/** Schemes that address something other than a page on this site. */
const NON_PAGE_SCHEME = /^(?:mailto|tel|sms|javascript|data|blob|ftp|ftps|file|ws|wss|news|magnet|intent):/i;

/** True when an href names its own host rather than inheriting the page's. */
const HAS_HOST = /^(?:https?:)?\/\//i;

/**
 * Collapse the ways one page can be addressed onto a single key.
 *
 * A capture may record `/about` while the markup links to `/about/`, and a static
 * project's file is `about.html`. All three are the same document, and treating
 * them as three would report working links as broken.
 */
function normalizePath(value) {
  let path = String(value ?? '');
  if (!path.startsWith('/')) return null;
  path = path.replace(/\/index\.html?$/i, '/');
  path = path.replace(/\.html?$/i, '');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

/** The normalised path a captured page occupies, or null when it has no usable url. */
function pagePath(page) {
  const direct = pathOf(page.url);
  if (direct) return normalizePath(direct);
  const raw = String(page.url ?? '').trim();
  if (!raw) return null;
  return normalizePath(raw.startsWith('/') ? raw : `/${raw}`);
}

/**
 * Where the served site begins inside the repository.
 *
 * A capture states its own urls and needs none of this. A snapshot with no
 * capture derives its pages from the repository's .html files, and there
 * `page.url` is the file's position in the repository rather than the address it
 * is served at: a site built into `dist/` reports `/dist/about` while its own
 * markup links to `/about`. Neither address is wrong - they differ by a prefix
 * that exists only because the pages were read off disk, and comparing across it
 * would report every working link in the site as broken.
 *
 * The shallowest directory holding an index.html is that prefix. Shallowest, and
 * one of them, deliberately: a section index at `blog/index.html` is not a second
 * site root, and treating it as one would strand every link between the section
 * and the rest of the site.
 */
function staticSiteRoot(pages) {
  let root = null;
  for (const page of pages) {
    if (page.origin !== 'static-file' || !page.source_file) continue;
    const file = String(page.source_file).replace(/\\/g, '/');
    if (!/(^|\/)index\.html?$/i.test(file)) continue;
    const dir = file.replace(/index\.html?$/i, '');
    if (root === null || dir.split('/').length < root.split('/').length) root = dir;
  }
  return root ?? '';
}

/** A repository-space path re-expressed in the served site's address space. */
function underRoot(path, root) {
  if (!path || !root) return path;
  const prefix = normalizePath(`/${root}`);
  if (!prefix || prefix === '/') return path;
  if (path === prefix || path === `${prefix}/`) return '/';
  if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length);
  return path;
}

/**
 * Hosts that count as this site.
 *
 * A capture's `page.url` is often a bare path, in which case the site has no
 * observable host and an absolute href cannot be proven to be internal. Those
 * hrefs are left alone: guessing that `https://example.com/x` belongs to the site
 * under inspection, on no evidence, would manufacture findings about somebody
 * else's server.
 */
function siteHosts(pages) {
  const hosts = new Set();
  for (const page of pages) {
    const host = hostOf(page.url);
    if (host) hosts.add(host);
  }
  return hosts;
}

/**
 * Resolve an href to a same-origin path, or say why it is out of scope.
 *
 * Cross-origin hrefs are excluded because this check cannot fetch. The status of
 * another host is not in the capture and cannot be derived from it, so the only
 * honest options are to say nothing or to invent a result; reporting an external
 * link as broken on the strength of its absence from our own page list would be
 * the latter. Fragment-only hrefs address the current document and never produce
 * a request at all, and `mailto:`, `tel:`, and `javascript:` are not pages.
 */
function resolveTarget(href, pageUrl, hosts, root) {
  const raw = String(href ?? '').trim();
  if (!raw || raw.startsWith('#')) return { skip: 'fragment-only or empty href' };
  if (NON_PAGE_SCHEME.test(raw)) return { skip: 'non-page scheme' };

  const ownUrl = String(pageUrl ?? '');
  const base = /^https?:\/\//i.test(ownUrl)
    ? ownUrl
    : `http://site.invalid${ownUrl.startsWith('/') ? ownUrl : `/${ownUrl}`}`;

  let url;
  try {
    // A protocol-relative href inherits the page's scheme; pinning it to https
    // only so `new URL` will accept it, since the host is all that is read back.
    url = new URL(raw.startsWith('//') ? `https:${raw}` : raw, base);
  } catch {
    return { skip: 'href is not a resolvable URL' };
  }
  if (!/^https?:$/i.test(url.protocol)) return { skip: 'non-page scheme' };

  const rooted = raw.startsWith('/') || HAS_HOST.test(raw);
  if (HAS_HOST.test(raw)) {
    if (!hosts.size) return { skip: 'absolute href and the capture records no host for this site' };
    if (!hosts.has(url.host)) return { skip: 'cross-origin' };
  }

  // A root-relative or absolute href is already written in the served site's
  // address space. A document-relative one was resolved against `page.url`, so it
  // came back carrying whatever prefix that url had, and has to be mapped down.
  const path = rooted ? url.pathname : underRoot(url.pathname, root);
  return { path, key: normalizePath(path) };
}

/**
 * Repository files that could serve a URL path.
 *
 * A path that no captured page occupies may still be a file the capture simply did
 * not visit, so the shipped tree is consulted before a link is called broken.
 *
 * The literal path is probed first, because a link's target does not have to be
 * HTML to be a real destination: /atom.xml, a PDF under /papers, an .ics
 * invitation and /robots.txt are all files a host serves exactly as they sit on
 * disk. Appending .html to them and asking whether `atom.xml.html` exists answered
 * a question nobody asked, and every non-HTML file the site genuinely ships was
 * reported as a broken link. Probing the literal path cannot hide a real defect,
 * since a link is only excused when a file with precisely that path exists.
 *
 * The extension-appending candidates stay, because an extensionless route is the
 * other ordinary case: /about is served by about.html or about/index.html, and the
 * href names neither.
 */
function staticCandidates(path) {
  const trimmed = String(path ?? '').replace(/^\/+/, '');
  if (!trimmed) return ['index.html', 'index.htm'];
  if (/\.html?$/i.test(trimmed)) return [trimmed];
  const stem = trimmed.replace(/\/+$/, '');
  return [stem, `${stem}.html`, `${stem}.htm`, `${stem}/index.html`, `${stem}/index.htm`];
}

/** Render a redirect chain of strings or `{ url, status }` entries for a report. */
function describeChain(chain) {
  return chain.map((hop) => {
    if (typeof hop === 'string') return hop;
    if (hop && typeof hop === 'object') return [hop.status, hop.url ?? hop.location].filter(Boolean).join(' ');
    return String(hop);
  });
}

const internalLinksResolve = {
  id: 'internal-links-resolve',
  requirements: ['SEO-212'],
  level: 'RUNTIME',
  title: 'Internal links point at URLs that resolve without an error or a hop',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    // A capture is a sample, and "this path matches no captured page" is only a
    // defect when the sample is the whole graph. One page proves nothing about
    // where its links go - every outbound link would look broken - so a capture
    // that small is reported as not measurable rather than as a wall of false
    // positives. The status and redirect rules would survive a single-page
    // capture, but reachability is the substance of this requirement and it
    // cannot be assessed at all here.
    if (snapshot.pages.length < 2) {
      return {
        status: 'NOT_APPLICABLE',
        findings: [],
        detail: `capture holds ${snapshot.pages.length} page(s); an internal link graph needs at least two to be a graph`,
      };
    }

    const hosts = siteHosts(snapshot.pages);
    const root = staticSiteRoot(snapshot.pages);
    const byPath = new Map();
    for (const page of snapshot.pages) {
      const key = underRoot(pagePath(page), root);
      if (key && !byPath.has(key)) byPath.set(key, page);
    }

    return pageCheck(internalLinksResolve, snapshot, (page, html) => {
      const out = [];
      // De-duplicated per page, not globally: a nav link repeated on twelve
      // pages is twelve broken links, because each of those twelve documents
      // offers a route it does not honour. Repeating the same href twice within
      // one document is a single defect, so it is reported once.
      const seen = new Set();

      for (const link of anchorsInOrder(html)) {
        if (link.href === null) continue;
        if (seen.has(link.href)) continue;
        seen.add(link.href);

        const target = resolveTarget(link.href, page.url, hosts, root);
        if (target.skip) continue;

        const match = target.key ? byPath.get(target.key) : null;

        if (!match) {
          const candidates = staticCandidates(target.path).map((file) => `${root}${file}`);
          if (candidates.some((file) => snapshot.has(file))) continue;
          out.push({
            requirement_id: 'SEO-212',
            location: location(page, link.index),
            severity: 'HIGH',
            detail: `internal link to "${link.href}" resolves to ${target.path}, which matches no captured page and no file in the repository`,
            // ROUTE is the only evidence type that can honestly carry this: the
            // target was never requested, so there is no status to attach and an
            // HTTP_STATUS item would have to invent one.
            evidence: [ev('ROUTE', {
              url: page.url,
              href: link.href,
              resolved_path: target.path,
              link_text: link.text || null,
              files_checked: candidates,
            })],
          });
          continue;
        }

        if (typeof match.status === 'number' && match.status >= 400) {
          const chain = Array.isArray(match.redirect_chain) ? match.redirect_chain : [];
          out.push({
            requirement_id: 'SEO-212',
            location: location(page, link.index),
            severity: 'HIGH',
            detail: `internal link to "${link.href}" resolves to ${match.url}, which the capture records as HTTP ${match.status}${chain.length ? ` after ${chain.length} redirect hop(s)` : ''}`,
            evidence: [
              ev('HTTP_STATUS', { url: match.url, status: match.status }),
              ev('ROUTE', { url: page.url, href: link.href, link_text: link.text || null }),
            ],
          });
          continue;
        }

        const chain = Array.isArray(match.redirect_chain) ? match.redirect_chain : [];
        if (chain.length) {
          // Reported separately from the status rule above rather than in
          // addition to it: a link that both redirects and then fails is one
          // defective link, and the failure is the more useful of the two facts.
          out.push({
            requirement_id: 'SEO-212',
            location: location(page, link.index),
            severity: 'HIGH',
            detail: `internal link to "${link.href}" reaches ${match.url} through ${chain.length} redirect hop(s); an internal link the site controls should name the destination, not a hop`,
            evidence: [
              ev('REDIRECT_CHAIN', { url: match.url, chain: describeChain(chain) }),
              ev('HTTP_STATUS', { url: match.url, status: match.status ?? null }),
              ev('ROUTE', { url: page.url, href: link.href, link_text: link.text || null }),
            ],
          });
        }
      }
      return out;
    });
  },
};

/**
 * Pages nothing in the capture links to.
 *
 * Reachability, not depth. A depth threshold would have to be invented, and an
 * invented threshold turns every ordinary long-tailed URL into a finding; a page
 * with no inbound internal link is a defect on any threshold, because the site's
 * own navigation does not contain it and neither does anything else the capture
 * read.
 *
 * The walk starts from every captured page rather than one nominated root, because
 * a capture is a sample and cannot prove which page is the site's entry point.
 * That makes this the weak form of the check - it reports a page isolated *within
 * the captured sample*, and says so, rather than claiming the page is unreachable
 * from a root it never identified.
 */
const orphanedPages = {
  id: 'orphaned-pages',
  requirements: ['SEO-222'],
  level: 'RUNTIME',
  title: 'Indexable pages other captured pages link to',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    // ponytail: a 3-page floor, because below it the sample cannot distinguish an
    // orphan from an entry point. Ceiling: a 2-page capture of a 10,000-page site
    // reports nothing at all. Upgrade if a capture ever records the crawl root.
    const indexable = snapshot.pages.filter((p) => p.indexable !== false);
    if (indexable.length < 3) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: `only ${indexable.length} indexable pages in this capture; too few to show that a page is isolated` };
    }

    const hosts = siteHosts(snapshot.pages);
    const root = staticSiteRoot(snapshot.pages);
    const inbound = new Map();

    for (const page of snapshot.pages) {
      const html = page.rendered_html ?? page.raw_html;
      if (!html) continue;
      for (const link of anchorsInOrder(html)) {
        const target = resolveTarget(link.href, page.url, hosts, root);
        if (target.skip || !target.key) continue;
        if (!inbound.has(target.key)) inbound.set(target.key, new Set());
        inbound.get(target.key).add(pagePath(page));
      }
    }

    const items = [];
    for (const page of indexable) {
      // The site root is reached by typing an address, not by following a link, so
      // "nothing links here" is what a root looks like. A page that redirects is
      // addressed the same way: a legacy URL nothing links to is the intended shape
      // of a redirect, not an orphan.
      const key = pagePath(page);
      if (key === '/') continue;
      if ((page.redirect_chain || []).length || REDIRECT.has(page.status)) continue;
      const sources = inbound.get(key);
      if (sources?.size) continue;
      items.push({
        requirement_id: 'SEO-222',
        location: location(page),
        severity: 'LOW',
        detail: `no other page in this capture links to ${page.url}; it is reachable only by address, so nothing in the site structure leads a crawler to it`,
        evidence: [
          ev('ROUTE', { url: page.url, linked_from: [] }),
          ev('RENDERED_HTML', { url: page.url, observed: `${snapshot.pages.length} pages examined for inbound links` }),
        ],
      });
    }
    return findingsFor(orphanedPages, items);
  },
};

export default [internalLinksResolve, orphanedPages];
