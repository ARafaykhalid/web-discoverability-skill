import { Link } from 'react-router-dom';

/**
 * Header, navigation, and footer shared by every route.
 *
 * The navigation names exactly the three routes the capture holds, so the
 * internal-link check has a complete set of targets to resolve against. A link
 * to a route the capture does not contain would be reported as unresolvable,
 * and that is a different defect from the one this fixture is about.
 */
export default function SiteChrome({ children }) {
  return (
    <>
      <header>
        <nav aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/features">Features</Link>
          <Link to="/handbook/routing">Handbook</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>Fixture content. Not a real site.</p>
      </footer>
    </>
  );
}
