/**
 * HTTP response checks.
 *
 * These read the one runtime fact that only a real request can produce: the
 * status code and the redirect chain. Every other module inspects markup, and a
 * document can be perfectly formed while the URL that served it returns the wrong
 * code - which is the class of defect an audit of source can never see.
 */
import { findTags, headings, visibleText } from '../html.ts';
import { gate, findingsFor, location, ev } from '../check-support.ts';

/**
 * Statuses that mean the request failed to produce the document the caller asked
 * for. A 404 or 410 is a correct answer to a missing resource; a 200 that renders
 * an empty template is not, because it tells a crawler the address is live.
 */
const NOT_FOUND = new Set([404, 410]);

/** Redirect statuses, kept so the vocabulary is in one place if a case needs it. */
const REDIRECT = new Set([301, 302, 303, 307, 308]);

/**
 * The `<body>` contents, or null when there is no body element.
 *
 * Emptiness has to be judged on the body, not on the document: `visibleText` keeps
 * `<title>` text, so a page whose entire content is a title reads as having
 * content. The null return is what keeps the check silent on a response with no
 * body element rather than calling it empty.
 */
function bodyOf(html) {
  return findTags(String(html ?? ''), 'body')[0]?.inner ?? null;
}

/**
 * The hop addresses in a chain.
 *
 * A chain is written two ways in this package: `wds capture` records plain URL
 * strings, and the benchmark fixtures record `{ status, url }` objects. Both are the
 * same fact, and a check that assumed one shape would silently see zero hops in
 * every fixture - which reads as a clean site rather than as a broken check.
 */
function hopsOf(page) {
  return (page.redirect_chain || [])
    .map((hop) => (typeof hop === 'string' ? hop : hop?.url))
    .filter(Boolean);
}

/**
 * Statuses a page may not serve where a document was expected.
 *
 * 3xx is deliberately absent: SEO-019 names "permanent move" and "temporary move"
 * among the states a public route is allowed to resolve to, so a redirect is a
 * correct answer and reporting it would contradict the requirement this check
 * exists to enforce. A capture that stops at a redirect rather than following it
 * is also the capture's choice, not the site's.
 *
 * What is left is the two real contradictions: a success code with no document in
 * it (204, 206), and any failure (4xx, 5xx) whatever the template renders.
 */
const WRONG_STATE = (status) => status >= 400 || (status >= 200 && status < 300 && status !== 200);

const statusCodeAccurate = {
  id: 'status-code-accurate',
  requirements: ['SEO-019', 'SEO-026'],
  level: 'RUNTIME',
  title: 'Every captured URL returns the status its state describes',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    // A direct loop rather than `pageCheck`, which skips any page without markup.
    // The pages whose status is wrong are precisely the ones that never delivered a
    // document - a 301, a 404, a bare error - so the shared markup helper would
    // have examined none of them.
    const items = [];
    for (const page of snapshot.pages) {
      const status = page.status;
      if (status === null || status === undefined) continue;

      const evidenceFor = (observed) => [
        ev('HTTP_STATUS', { url: page.url, status, observed }),
        ev('ROUTE', { url: page.url }),
      ];
      const chain = Array.isArray(page.redirect_chain) ? page.redirect_chain.length : 0;

      if (WRONG_STATE(status)) {
        items.push({
          requirement_id: 'SEO-019',
          location: location(page),
          severity: 'CRITICAL',
          detail: `${page.url} returned ${status}${NOT_FOUND.has(status) ? ', which is the correct answer for a resource that no longer exists' : ' rather than 200'}${chain ? `, after ${chain} redirect hop(s)` : ''}`,
          evidence: evidenceFor({ status, redirects: page.redirect_chain ?? [] }),
        });
      }

      // The soft-404 shape: the address answers 200 and delivers no document, so a
      // crawler is told the page is live when there is nothing there. Emptiness is
      // measured as no readable text and no headings rather than as "no tags": a
      // stripped template is full of markup and has no content, and testing for
      // tags would pass every real instance of the defect this exists to catch.
      const html = page.rendered_html ?? page.raw_html;
      const body = bodyOf(html);
      if (status === 200 && body !== null && !visibleText(body) && !headings(body).length) {
        items.push({
          requirement_id: 'SEO-026',
          location: location(page),
          severity: 'HIGH',
          detail: '200 response carries no readable text and no headings; a resource that no longer exists should answer 404 or 410 rather than an empty 200',
          evidence: evidenceFor({ status, body_bytes: html.length, readable_words: 0 }),
        });
      }
    }
    return findingsFor(statusCodeAccurate, items);
  },
};

const redirectSingleHop = {
  id: 'redirect-single-hop',
  requirements: ['SEO-025'],
  level: 'RUNTIME',
  title: 'No URL needs more than one redirect, and no chain revisits a URL',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const items = [];
    for (const page of snapshot.pages) {
      const chain = hopsOf(page);
      if (!chain.length) continue;
      const hops = chain.length;
      const loop = chain.length > new Set(chain).size;

      if (hops > 1 || loop) {
        items.push({
          requirement_id: 'SEO-025',
          location: location(page),
          severity: 'HIGH',
          detail: loop
            ? `${page.url} redirects through a cycle (${chain.join(' -> ')}); a crawler stops following at the loop`
            : `${page.url} takes ${hops} redirects to reach content (${chain.join(' -> ')}); each hop costs crawl budget and dilutes signals`,
          evidence: [
            ev('REDIRECT_CHAIN', { url: page.url, chain, hops }),
            ev('HTTP_STATUS', { url: page.url, status: page.status }),
          ],
        });
      }
      // A captured URL whose own status is still 3xx is the capture declining to
      // follow the hop, not a defect the site committed. `wds capture` follows to a
      // document; a hand-written capture may record the redirect and stop. Calling
      // that a broken redirect would report the capture's choice as the site's, so
      // the status is used as the loop test instead - a chain that returns to an
      // address it already visited is a genuine loop whatever the final status is.
      if (REDIRECT.has(page.status) && chain.includes(page.url)) {
        items.push({
          requirement_id: 'SEO-025',
          location: location(page),
          severity: 'HIGH',
          detail: `${page.url} redirects to itself (${chain.join(' -> ')}); a crawler stops following at the loop`,
          evidence: [
            ev('REDIRECT_CHAIN', { url: page.url, chain, final_status: page.status }),
            ev('HTTP_STATUS', { url: page.url, status: page.status }),
          ],
        });
      }
    }
    return findingsFor(redirectSingleHop, items);
  },
};

export default [statusCodeAccurate, redirectSingleHop];