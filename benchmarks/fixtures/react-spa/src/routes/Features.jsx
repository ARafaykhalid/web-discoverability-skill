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
 * The features route.
 *
 * Served by the same shell as the home route, so its initial response is the
 * same bytes: no title, no heading, no canonical. The route supplies all three
 * after mount.
 */
export default function Features() {
  useDocumentHead({
    path: '/features',
    title: 'Features — Acme Labs',
    description:
      'What the client-rendered fixture does after mount: writes a title, a description, a canonical, and a preview set that none of its responses contain.',
    image: '/img/features.png',
    imageAlt: 'A diagram of a request arriving before the script that fills it in.',
    graph: GRAPH,
  });

  return (
    <article>
      <h1>What happens between the response and the paint</h1>
      <p>
        The response for this route is the same app shell the home route gets. Vite serves one
        entry document for both, and the client router decides which component to mount by reading
        the address bar. From the server&rsquo;s point of view the two URLs are indistinguishable,
        which is exactly why neither of them can carry a route-specific title.
      </p>
      <h2>The sequence</h2>
      <p>
        The browser receives the shell and finds one module script. It downloads that module, which
        pulls in React, the DOM renderer, the router, the shared chrome, and finally this component.
        React mounts, the effect in useDocumentHead runs, and the head is rewritten: a title
        appears, a meta description appears, a link with rel=canonical is appended, eight preview
        properties are appended, and a structured-data block is inserted. The document is now
        correct. It took four network round trips and an execution pass to become correct.
      </p>
      <img
        src="/img/features.png"
        alt="A diagram of a request arriving before the script that fills it in."
        width="1200"
        height="630"
      />
      <h2>Why the head matters more than the body here</h2>
      <p>
        Missing body text degrades gracefully in the sense that a consumer sees a thin page. A
        missing title does not degrade at all: there is no fallback, and a document with no title
        is addressed by its URL in every listing that mentions it. A missing canonical is worse
        again, because the absence is not an error that anything reports. The engine simply picks a
        canonical URL itself, from whichever variants it happened to crawl, and the site never finds
        out which one it chose.
      </p>
      <p>
        None of this is a bug in React or in Vite. It is the predictable consequence of putting the
        head in an effect, and the remedy is to render the route where the response is produced
        rather than after it arrives.
      </p>
    </article>
  );
}
