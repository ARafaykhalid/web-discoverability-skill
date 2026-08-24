/**
 * Header, navigation, and footer shared by every page.
 *
 * Plain anchors, not a router: each entry is a separate document, so a click is
 * a navigation and the address in the href is the address the server serves. The
 * three hrefs name the three routes the capture holds, which is what lets
 * internal-links-resolve verify the whole graph rather than a sample of it.
 */
export default function SiteChrome({ children }) {
  return (
    <>
      <header>
        <nav aria-label="Primary">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/changelog">Changelog</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>Fixture content. Not a real site.</p>
      </footer>
    </>
  );
}
