import { useDocumentHead } from '../lib/useDocumentHead.js';

const GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://example.com/#website',
      url: 'https://example.com/',
      name: 'Acme Labs',
      publisher: { '@id': 'https://example.com/#organization' },
    },
    {
      '@type': 'Organization',
      '@id': 'https://example.com/#organization',
      url: 'https://example.com/',
      name: 'Acme Labs',
      logo: 'https://example.com/img/logo.png',
    },
  ],
};

/**
 * The home route.
 *
 * Everything below - the heading, the paragraphs, the image, and the head
 * metadata written by useDocumentHead - exists only in this module. None of it
 * appears in the response the server sends for `/`, which is why findings about
 * this route are located at this file: it is the file somebody has to change.
 */
export default function Home() {
  useDocumentHead({
    path: '/',
    title: 'Acme Labs — what a crawler actually receives',
    description:
      'Acme Labs is the client-rendered fixture in the discoverability benchmark. Its served HTML is an empty div; everything readable arrives after the bundle executes.',
    image: '/img/cover.png',
    imageAlt: 'The words Acme Labs set in plain type on a flat background.',
    graph: GRAPH,
  });

  return (
    <article>
      <h1>Everything on this page arrived after the JavaScript ran</h1>
      <p>
        This route is one half of a deliberate pair. The other half is the response the server
        actually sends, which is an app shell: a stylesheet, a module script, an empty div, and a
        short note asking the reader to enable scripts. There is no heading in it, no title, no
        canonical URL, and no prose.
      </p>
      <p>
        The distinction matters because a large number of consumers read the first response and
        stop. Link unfurlers, feed readers, plain HTTP clients, retrieval pipelines, and archival
        crawlers all fetch bytes without running a browser engine. A search crawler that does run
        one still budgets for it, and a route whose content only exists after execution is
        competing for that budget against every other page on the web.
      </p>
      <img
        src="/img/cover.png"
        alt="The words Acme Labs set in plain type on a flat background."
        width="1200"
        height="630"
      />
      <h2>What the fixture is proving</h2>
      <p>
        Two things, kept apart on purpose. The first is that the word-count comparison in
        content-in-initial-html can tell an app shell from a document. The second is that the
        metadata written by useDocumentHead is invisible to the initial response even though it is
        perfectly correct once it exists, so the same route can be simultaneously well-formed and
        undiscoverable.
      </p>
      <p>
        The rendered captures in this fixture are deliberately clean by every other measure: one
        title, one meta description, one absolute self-referencing canonical, a complete preview
        set including an image alt, a structured-data graph whose two nodes carry distinct
        identifiers, and images that declare their own dimensions. If any of those were wrong the
        fixture would report findings that have nothing to do with rendering, and the benchmark
        would stop being able to attribute a finding to the defect that caused it.
      </p>
    </article>
  );
}
