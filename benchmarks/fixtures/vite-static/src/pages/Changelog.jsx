import SiteChrome from '../components/SiteChrome.jsx';

/**
 * The changelog. One section per release, newest first, matching the entries in
 * public/feed.xml so the feed and the page tell the same story.
 */
export default function Changelog() {
  return (
    <SiteChrome>
      <h1>Changelog</h1>
      <p>
        Releases of the Acme toolchain, newest first. Each heading below corresponds to one entry in the release
        feed, and the dates are the dates the documentation was rebuilt.
      </p>
      <h2>1.4.0 — 30 January 2026</h2>
      <p>
        The build now writes every route to its own finished document. Before this release the body of each page was
        assembled in the browser, which meant the first response carried a heading for one route and nothing for the
        others.
      </p>
      <h2>1.3.0 — 11 December 2025</h2>
      <p>
        Each route became a separate HTML entry with its own hand-written head. The single shared shell that preceded
        it could only ever describe one page, so two routes were served identical titles and identical descriptions.
      </p>
      <h2>1.2.0 — 6 November 2025</h2>
      <p>
        Added the release feed and referenced it from every page. Readers who wanted to follow the toolchain had been
        checking this page by hand.
      </p>
    </SiteChrome>
  );
}
