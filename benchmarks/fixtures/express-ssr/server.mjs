/**
 * Routes and response headers.
 *
 * Everything a crawler sees is decided in this file: the HTML comes from string
 * templates, and the indexing and caching signals come from the headers set below.
 * There is no framework metadata layer, so nothing reconciles a header with the
 * markup a template emitted - if the two disagree, both are served.
 */
import express from 'express';
import { ORIGIN, layoutHead, document } from './src/render.mjs';
import { home, pricing, tileGuide, contact, internalPreview } from './src/pages.mjs';

const app = express();

app.use(express.static('public', { maxAge: '1h' }));

/** Keep drafts out of the index. Applied by path prefix, independently of the markup. */
app.use('/internal', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex');
  res.set('Cache-Control', 'no-store');
  next();
});

function send(res, page, canonicalUrl) {
  const head = layoutHead({ ...page, canonicalUrl });
  const body = page.jsonLd
    ? `${page.body}\n  <script type="application/ld+json">\n${JSON.stringify(page.jsonLd, null, 2)}\n  </script>`
    : page.body;
  res.type('html');
  res.send(document({ head, body }));
}

app.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  send(res, home, `${ORIGIN}/`);
});

// `req.originalUrl` includes the query string the visitor arrived with, so a link
// carrying a campaign parameter produces a canonical that names that visit rather
// than the page. Every other route passes its own path.
app.get('/pricing', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  send(res, pricing, `${ORIGIN}${req.originalUrl}`);
});

app.get('/guides/roof-tile-selection', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  send(res, tileGuide, `${ORIGIN}/guides/roof-tile-selection`);
});

app.get('/contact', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  send(res, contact, `${ORIGIN}/contact`);
});

app.get('/internal/preview', (req, res) => {
  send(res, internalPreview, `${ORIGIN}/internal/preview`);
});

// The costs page moved in 2024. The redirect stayed; the sitemap was not updated.
app.get('/legacy-pricing', (req, res) => res.redirect(301, '/pricing'));

app.listen(process.env.PORT || 3000);
