/**
 * Canonicalization checks.
 *
 * A canonical is a hint about identity, and the only version of it that matters
 * is the one in the response a crawler received. A framework head-merge, an edge
 * rewrite, or a client-side router can all change it after the source file, so
 * these checks read served output.
 */
import { isAbsoluteUrl } from '../html.ts';
import {
  pageCheck, gate, findingsFor, location, ev, linkTags, headLinkTags, hasHead, pathOf,
  sameUrl, declaresNoindex, robotsDirectives,
} from '../check-support.ts';

/**
 * Parameters that identify a visit rather than a document. A canonical carrying
 * one of these asks the engine to treat one visit as the canonical identity of
 * the page, which splits the signals it was meant to consolidate.
 */
const TRACKING_PARAMS = [
  /^utm_/i, /^gclid$/i, /^gbraid$/i, /^wbraid$/i, /^dclid$/i, /^fbclid$/i, /^msclkid$/i,
  /^twclid$/i, /^ttclid$/i, /^yclid$/i, /^igshid$/i, /^ref$/i, /^referrer$/i,
  /^sessionid$/i, /^session_id$/i, /^sid$/i, /^phpsessid$/i, /^jsessionid$/i,
  /^s_kwcid$/i, /^mc_cid$/i, /^mc_eid$/i, /^_ga$/i, /^_gl$/i, /^hsa_/i, /^vero_/i,
];

function queryParams(href) {
  const raw = String(href ?? '');
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1).split('#')[0] : '';
  if (!query) return [];
  return query.split('&').map((pair) => pair.split('=')[0]).filter(Boolean);
}

const canonicalSelfReferencingAbsolute = {
  id: 'canonical-self-referencing-absolute',
  requirements: ['SEO-049'],
  level: 'RUNTIME',
  title: 'One absolute self-referencing canonical per indexable page',
  run(snapshot) {
    return pageCheck(canonicalSelfReferencingAbsolute, snapshot, (page, html) => {
      const out = [];
      const evidenceFor = (observed) => [
        ev('RENDERED_HTML', { url: page.url, observed }),
        ev('ROUTE', { url: page.url }),
      ];
      const all = linkTags(html, 'canonical');

      if (!all.length) {
        return [{
          requirement_id: 'SEO-049',
          location: location(page),
          severity: 'HIGH',
          detail: 'no rel=canonical served, so the engine picks the canonical URL itself',
          evidence: evidenceFor('no link[rel=canonical]'),
        }];
      }

      // Only meaningful when the document really has a <head>: headOf falls back
      // to the whole document otherwise, which would make every canonical look
      // correctly placed.
      if (hasHead(html)) {
        const inHead = new Set(headLinkTags(html, 'canonical').map((tag) => tag.index));
        for (const tag of all.filter((t) => !inHead.has(t.index))) {
          out.push({
            requirement_id: 'SEO-049',
            location: location(page, tag.index),
            severity: 'HIGH',
            detail: 'canonical link is outside <head>; a link element in the body is ignored',
            evidence: evidenceFor(tag.raw),
          });
        }
      }

      const hrefs = [...new Set(all.map((tag) => (tag.attrs.href || '').trim()).filter(Boolean))];
      if (hrefs.length > 1) {
        out.push({
          requirement_id: 'SEO-049',
          location: location(page, all[1].index),
          severity: 'HIGH',
          detail: `${hrefs.length} conflicting canonical URLs served; conflicting hints are discarded`,
          evidence: [
            ev('RENDERED_HTML', { url: page.url, observed: hrefs }),
            ev('RAW_HTML', { url: page.url, observed: all.map((t) => t.raw) }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }

      for (const tag of all) {
        const href = (tag.attrs.href || '').trim();
        if (!href) {
          out.push({
            requirement_id: 'SEO-049',
            location: location(page, tag.index),
            severity: 'HIGH',
            detail: 'canonical link has an empty href, which resolves to the current URL only by accident',
            evidence: evidenceFor(tag.raw),
          });
          continue;
        }
        if (!isAbsoluteUrl(href)) {
          out.push({
            requirement_id: 'SEO-049',
            location: location(page, tag.index),
            severity: 'HIGH',
            detail: `canonical href "${href}" is not absolute; the protocol and host must be explicit`,
            evidence: evidenceFor(href),
          });
          continue;
        }
        // Cross-page canonicalisation is a legitimate technique, but it is not
        // what this requirement asks for, so the mismatch is reported with the
        // intent named rather than assumed to be a mistake.
        const own = pathOf(page.url);
        const target = pathOf(href);
        if (own && target && own.replace(/\/$/, '') !== target.replace(/\/$/, '')) {
          out.push({
            requirement_id: 'SEO-049',
            location: location(page, tag.index),
            severity: 'HIGH',
            detail: `canonical points at ${target} rather than this page (${own}); if the cross-canonical is deliberate it needs to be recorded, and if it is not the page is de-indexing itself`,
            evidence: evidenceFor({ page_path: own, canonical_path: target }),
          });
        }
      }
      return out;
    }, { indexableOnly: true });
  },
};

const canonicalNoTrackingParams = {
  id: 'canonical-no-tracking-params',
  requirements: ['SEO-052'],
  level: 'RUNTIME',
  title: 'Canonical values carry no tracking or session parameters',
  run(snapshot) {
    return pageCheck(canonicalNoTrackingParams, snapshot, (page, html) => {
      const out = [];
      for (const tag of linkTags(html, 'canonical')) {
        const href = (tag.attrs.href || '').trim();
        const offending = queryParams(href).filter((name) => TRACKING_PARAMS.some((re) => re.test(name)));
        if (!offending.length) continue;
        out.push({
          requirement_id: 'SEO-052',
          location: location(page, tag.index),
          severity: 'MEDIUM',
          detail: `canonical carries visit-scoped parameter(s) ${offending.join(', ')}, which fragments the identity of one document across many URLs`,
          evidence: [
            ev('RENDERED_HTML', { url: page.url, observed: href, parameters: offending }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }
      return out;
    }, { indexableOnly: true });
  },
};

/**
 * Whether the URL a canonical names is one the capture can vouch for.
 *
 * Only a response proves this. A canonical is a promise about another address, and
 * a target the capture never visited is unproven rather than broken - reporting it
 * would manufacture findings about requests nobody made, which is the failure mode
 * the internal-link check is careful to avoid.
 */
function pagesByUrl(pages) {
  const byUrl = new Map();
  for (const page of pages) {
    for (const address of [page.url, ...(page.redirect_chain || [])]) {
      const key = pathOf(address);
      if (key && !byUrl.has(key)) byUrl.set(key, page);
    }
  }
  return byUrl;
}

const canonicalTargetResolves = {
  id: 'canonical-target-resolves',
  requirements: ['SEO-051'],
  level: 'RUNTIME',
  title: 'Every canonical names a target that returns 200 and stays indexable',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const targets = pagesByUrl(snapshot.pages);
    const items = [];

    for (const page of snapshot.pages) {
      const html = page.rendered_html ?? page.raw_html;
      if (!html) continue;

      for (const tag of linkTags(html, 'canonical')) {
        const href = (tag.attrs.href || '').trim();
        if (!href || !isAbsoluteUrl(href)) continue;
        const key = pathOf(href);
        const target = key ? targets.get(key) : null;
        if (!target) continue;
        // A page that canonicalises to itself and asks not to be indexed is
        // coherent, not defective: it is excluded from the index and its canonical
        // names the address it would have at. Only a canonical pointing at some
        // *other* excluded address is the contradiction this requirement is about,
        // and `canonical-self-referencing-absolute` already governs the self case.
        if (sameUrl(target.url, page.url)) continue;

        const evidenceFor = (observed) => [
          ev('RENDERED_HTML', { url: page.url, observed }),
          ev('HTTP_STATUS', { url: target.url, status: target.status }),
        ];

        if (target.redirect_chain?.length || target.status !== 200) {
          items.push({
            requirement_id: 'SEO-051',
            location: location(page, tag.index),
            severity: 'HIGH',
            detail: `canonical names ${target.url}, which returned ${target.status}${target.redirect_chain?.length ? ` after ${target.redirect_chain.length} redirect(s)` : ''} rather than serving the document directly`,
            evidence: evidenceFor({ canonical: href, target_status: target.status, target_chain: target.redirect_chain }),
          });
        }

        if (declaresNoindex(target)) {
          items.push({
            requirement_id: 'SEO-051',
            location: location(page, tag.index),
            severity: 'HIGH',
            detail: `canonical names ${target.url}, which asks not to be indexed, so the page points its identity at an excluded address`,
            evidence: [
              ...evidenceFor({ canonical: href, target_noindex: true }),
              ev('RENDERED_HTML', {
                url: target.url,
                observed: robotsDirectives(target).map((d) => `${d.source}: ${d.value}`),
              }),
            ],
          });
        }
      }
    }
    return findingsFor(canonicalTargetResolves, items);
  },
};

export default [canonicalSelfReferencingAbsolute, canonicalNoTrackingParams, canonicalTargetResolves];
