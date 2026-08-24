/**
 * Canonicalization checks.
 *
 * A canonical is a hint about identity, and the only version of it that matters
 * is the one in the response a crawler received. A framework head-merge, an edge
 * rewrite, or a client-side router can all change it after the source file, so
 * these checks read served output.
 */
import { isAbsoluteUrl } from '../html.mjs';
import {
  pageCheck, location, ev, linkTags, headLinkTags, hasHead, pathOf,
} from '../check-support.mjs';

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

export default [canonicalSelfReferencingAbsolute, canonicalNoTrackingParams];
