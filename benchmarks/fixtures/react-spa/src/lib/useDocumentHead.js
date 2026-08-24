import { useEffect } from 'react';

const ORIGIN = 'https://example.com';

/** Create or update a meta element identified by one of its attributes. */
function upsertMeta(attribute, key, content) {
  let el = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Create or update the single link element carrying a given rel. */
function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Replace the structured-data block, so a route change never leaves two. */
function upsertJsonLd(graph) {
  const existing = document.head.querySelector('script[type="application/ld+json"]');
  if (existing) existing.remove();
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(graph, null, 2);
  document.head.appendChild(el);
}

/**
 * Write the document head from inside the component tree.
 *
 * This is the mechanism behind every finding this fixture is expected to
 * produce. It works perfectly in a browser and produces nothing at all in the
 * initial response, so the title, the meta description, the canonical, and the
 * preview properties of every route exist only for consumers that execute
 * scripts. On the handbook routes it also overwrites the canonical that
 * handbook.html hard-codes, which is a mutation rather than an addition.
 *
 * The honest fix is not to move this logic - it is to render the routes on the
 * server or at build time so the head is already correct when the bytes leave.
 */
export function useDocumentHead({ path, title, description, image, imageAlt, graph }) {
  useEffect(() => {
    const url = `${ORIGIN}${path}`;
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large');
    upsertLink('canonical', url);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Acme Labs');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', `${ORIGIN}${image}`);
    upsertMeta('property', 'og:image:alt', imageAlt);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    if (graph) upsertJsonLd(graph);
  }, [path, title, description, image, imageAlt, graph]);
}

export { ORIGIN };
