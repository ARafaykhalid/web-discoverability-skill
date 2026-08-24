/**
 * Response templates.
 *
 * There is no build step and no head-management library here, so the only thing
 * that decides what a crawler receives is string concatenation in this file. The
 * `extraHead` seam below is what makes a page-specific head fragment possible, and
 * it is also why a fragment that repeats an element the layout already emitted
 * produces a duplicate rather than an override.
 */

export const ORIGIN = 'https://example.com';

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The shared head.
 *
 * `canonicalUrl` is passed in rather than derived so each route states its own
 * identity. Routes that hand this the requested URL instead of the route path put
 * whatever query string the visitor arrived with into the canonical.
 */
export function layoutHead({ title, description, canonicalUrl, image, imageAlt, extraHead = '' }) {
  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonicalUrl)}">
  <link rel="alternate" type="application/atom+xml" href="${ORIGIN}/feed.xml" title="Ridgeline Roofing notes">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Ridgeline Roofing">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonicalUrl)}">
  <meta property="og:image" content="${ORIGIN}${esc(image)}">
  <meta property="og:image:alt" content="${esc(imageAlt)}">
${extraHead}`;
}

/** The shared navigation. Every href here is a route server.mjs actually mounts. */
export function siteNav() {
  return `  <nav aria-label="Main">
    <a href="/">Home</a>
    <a href="/pricing">What work costs</a>
    <a href="/guides/roof-tile-selection">Choosing tiles</a>
    <a href="/contact">Contact</a>
  </nav>`;
}

export function siteFooter() {
  return `  <footer>
    <p>Ridgeline Roofing, 14 Harbour Road, Whitby. Registered in England, company 04871226.</p>
  </footer>`;
}

/** The whole response body. `lang` is fixed because the site is published only in one language. */
export function document({ head, body }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
${head}
</head>
<body>
${siteNav()}
${body}
${siteFooter()}
</body>
</html>
`;
}
