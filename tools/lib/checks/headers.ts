/**
 * Response header checks.
 *
 * Every fact here is a header the snapshot already recorded on every request the
 * capture made. Nothing needs a browser, a network call, or a new data source -
 * these four domains had no check at all while the evidence sat unused in the
 * snapshot, which is the cheapest possible kind of coverage to add and the easiest
 * to get wrong by guessing rather than reading.
 *
 * Each check reads only what the requirement names. A header the requirement does
 * not discuss is not a defect, and a check that reported every deviation from a
 * house style would be auditing taste rather than the record it is bound to.
 */
import { gate, findingsFor, location, ev, declaresNoindex, hostOf } from '../check-support.ts';
import type { Finding } from '../snapshot.ts';

/** Headers that make a response's body vary, keyed by what the body actually depends on. */
const VARY_BY_BODY = new Set(['accept-encoding', 'accept-language']);

function headerItems(observed: Record<string, string | number | unknown>) {
  return [ev('HTTP_HEADER', observed)];
}

/**
 * The headers a page was actually sent with, or null when there was no request.
 *
 * Two cases produce a page with no headers to judge, and neither is a page that
 * failed to send them:
 *
 *   - A snapshot built from a project's `.html` files synthesises a page per file.
 *     No request was made, and for a static project there is no server whose
 *     configuration could have sent one; the host sets it, not the repository.
 *   - A capture whose recorded response carried no headers at all.
 *
 * Both are unmeasured, so both return null, and "absent" goes on meaning "the
 * response did not send it" and nothing else. Without this the check reports every
 * static page in the repository as missing a cache policy, which is a statement
 * about the absence of a server rather than about the site.
 */
function observedHeaders(page: { origin?: string; headers?: Record<string, string> }): Record<string, string> | null {
  if (page.origin !== 'capture') return null;
  const headers = page.headers ?? {};
  return Object.keys(headers).length ? headers : null;
}

/** True when the page was served over a scheme that can carry a transport policy. */
function isSecure(page: { url: string }) {
  return /^https:/i.test(String(page.url ?? ''));
}

const cachePolicyDeclared = {
  id: 'cache-policy-declared',
  requirements: ['SEO-337'],
  level: 'RUNTIME',
  title: 'Every response declares a cache policy',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const items: Finding[] = [];
    for (const page of snapshot.pages) {
      const headers = observedHeaders(page);
      if (!headers) continue;
      const value = headers['cache-control'];
      if (value !== undefined && String(value).trim()) continue;
      items.push({
        requirement_id: 'SEO-337',
        check_id: 'cache-policy-declared',
        location: location(page),
        severity: 'MEDIUM',
        detail: `no Cache-Control header on ${page.url}, so intermediaries are left to guess whether the response is cacheable and a stale copy can outlive the content`,
        evidence: [
          ...headerItems({ url: page.url, observed: { 'cache-control': null } }),
          ev('ROUTE', { url: page.url, status: page.status }),
        ],
      });
    }
    return findingsFor(cachePolicyDeclared, items);
  },
};

const varyRestrictedToBody = {
  id: 'vary-restricted-to-body',
  requirements: ['SEO-345'],
  level: 'RUNTIME',
  title: 'Vary names only headers the body actually depends on',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const items: Finding[] = [];
    for (const page of snapshot.pages) {
      const raw = observedHeaders(page)?.vary;
      if (!raw) continue;
      // `Vary: *` tells caches the response cannot be reused for anything, and a
      // Vary on a header the body does not read fragments one document into many
      // cache entries for no benefit.
      // Compared lowercased, because header names are case-insensitive, but quoted
      // as the server sent them: a reader checking this against a response needs to
      // see `User-Agent`, not `user-agent`.
      const fields = String(raw).split(',').map((f) => f.trim()).filter(Boolean);
      const lowered = fields.map((f) => f.toLowerCase());
      const offenders = fields.filter((_, i) => lowered[i] !== '*' && !VARY_BY_BODY.has(lowered[i]));
      if (!lowered.includes('*') && !offenders.length) continue;
      items.push({
        requirement_id: 'SEO-345',
        check_id: 'vary-restricted-to-body',
        location: location(page),
        severity: 'MEDIUM',
        detail: lowered.includes('*')
          ? `Vary: * on ${page.url} tells every cache the response is unique per request, so it is never reused`
          : `Vary on ${offenders.join(', ')} for ${page.url}; the body does not vary on ${offenders.length === 1 ? 'that header' : 'those headers'}, so each value gets its own cache entry for no reason`,
        evidence: [
          ...headerItems({ url: page.url, observed: { vary: String(raw) } }),
          ev('RENDERED_HTML', { url: page.url, observed: 'body inspected for dependence on the named request headers' }),
        ],
      });
    }
    return findingsFor(varyRestrictedToBody, items);
  },
};

const transportSecurityDeclared = {
  id: 'transport-security-declared',
  requirements: ['SEO-390'],
  level: 'RUNTIME',
  title: 'The production origin declares a transport security policy',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    // Filtered on observed headers as well as on scheme: an unmeasured https page
    // cannot be reported as missing a transport policy any more than a static one.
    const secure = snapshot.pages.filter((page) => isSecure(page) && observedHeaders(page));
    // A capture with relative URLs records no scheme, so there is no evidence the
    // origin is https at all. Saying "no policy observed" there would be reporting
    // the absence of a capture setting as a defect on the site.
    if (!secure.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no captured page was served over https with recorded headers' };
    }

    const missing = secure.filter((page) => !String(page.headers?.['strict-transport-security'] ?? '').trim());
    if (!missing.length) return findingsFor(transportSecurityDeclared, []);

    // One finding for the origin, not one per page. A transport policy is declared
    // per host, so four pages missing the header is one fact about the site, and
    // four copies of it train a reader to skim past the finding.
    const origin = hostOf(missing[0].url) ?? missing[0].url;
    return findingsFor(transportSecurityDeclared, [
      {
        requirement_id: 'SEO-390',
        check_id: 'transport-security-declared',
        location: missing[0].source_file ?? origin,
        severity: 'HIGH',
        detail: `${missing.length} of ${secure.length} page(s) on ${origin} were served over https with no Strict-Transport-Security header, so the first request to this host is still reachable over plaintext`,
        evidence: [
          ...headerItems({ url: missing[0].url, observed: { 'strict-transport-security': null }, pages_missing_it: missing.length, pages_checked: secure.length }),
          ev('HTTP_STATUS', { url: missing[0].url, status: missing[0].status }),
        ],
      } as Finding,
    ]);
  },
};

const privateRoutesExcluded = {
  id: 'private-routes-excluded',
  requirements: ['SEO-098'],
  level: 'RUNTIME',
  title: 'A route that refuses the reader is excluded from the index',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const items: Finding[] = [];
    for (const page of snapshot.pages) {
      const status = page.status ?? 0;
      // A static page has no status either; without one there is no refusal to
      // reason about, so the check stays silent rather than inferring a 200.
      if (status !== 401 && status !== 403) continue;
      // The refusal is correct; what matters is whether the address stays out of
      // the index afterwards. A 401 body that also carries noindex closes the
      // question. A 403 that does not is the ordinary leak: the URL is a real,
      // crawlable address that happens to refuse this visitor.
      const html = page.rendered_html ?? page.raw_html ?? '';
      if (html && declaresNoindex({ rendered_html: html, raw_html: html, headers: page.headers ?? {} })) continue;
      items.push({
        requirement_id: 'SEO-098',
        check_id: 'private-routes-excluded',
        location: location(page),
        severity: 'HIGH',
        detail: `${page.url} answers ${status} but does not ask not to be indexed, so the address remains a crawlable URL that merely refuses the reader`,
        evidence: [
          ev('HTTP_STATUS', { url: page.url, status }),
          ...(html ? [ev('RENDERED_HTML', { url: page.url, observed: 'no noindex directive in the response' })] : []),
        ],
      });
    }
    return findingsFor(privateRoutesExcluded, items);
  },
};

export default [cachePolicyDeclared, varyRestrictedToBody, transportSecurityDeclared, privateRoutesExcluded];