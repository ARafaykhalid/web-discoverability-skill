import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDocumentHead } from '../lib/useDocumentHead.js';

const ARTICLES = {
  routing: {
    title: 'Client routing and the canonical URL',
    summary:
      'Why a router that rewrites the canonical after mount leaves two different answers on record for the same URL.',
    image: '/img/handbook-routing.png',
    imageAlt: 'Two link elements with different href values, one replacing the other.',
  },
};

/**
 * One handbook article.
 *
 * The body arrives from an API after mount, so this route is thin twice over:
 * the initial response has no article text, and the first render has none either.
 * The canonical is the interesting part - handbook.html already declares
 * https://example.com/handbook, and useDocumentHead replaces it with the
 * article's own URL, so the value a consumer records depends entirely on when it
 * read the document.
 */
export default function HandbookArticle() {
  const { slug } = useParams();
  const meta = ARTICLES[slug] ?? ARTICLES.routing;
  const [body, setBody] = useState(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/handbook/${slug}`)
      .then((response) => response.json())
      .then((payload) => {
        if (live) setBody(payload.body);
      })
      .catch(() => {
        if (live) setBody(null);
      });
    return () => {
      live = false;
    };
  }, [slug]);

  useDocumentHead({
    path: `/handbook/${slug}`,
    title: `${meta.title} — Acme Labs handbook`,
    description: meta.summary,
    image: meta.image,
    imageAlt: meta.imageAlt,
    graph: {
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
    },
  });

  return (
    <article>
      <h1>{meta.title}</h1>
      <p>{meta.summary}</p>
      {body ? <div>{body}</div> : <p>Loading the article&hellip;</p>}
      <img src={meta.image} alt={meta.imageAlt} width="1200" height="630" />
    </article>
  );
}
