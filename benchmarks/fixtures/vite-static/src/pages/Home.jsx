import SiteChrome from '../components/SiteChrome.jsx';

/**
 * The home page body.
 *
 * The head lives in index.html, not here. A head assembled by a component is a
 * head nobody can find by opening a file, and the whole point of this fixture is
 * that every fact a crawler reads was written down where a person can edit it.
 */
export default function Home() {
  return (
    <SiteChrome>
      <h1>Acme Docs</h1>
      <p>
        This site is built with Vite, and every route is a separate HTML entry named in <code>vite.config.js</code>.
        The head of each entry is written by hand: the title, the description, the canonical URL, the preview
        properties and the feed link are bytes in a file rather than values assembled at run time.
      </p>
      <p>
        The body is produced differently. It comes from a React component that <code>scripts/prerender.mjs</code>{' '}
        renders to static markup during the build and substitutes into the placeholder its entry left behind. By the
        time a document is written into <code>dist/</code> it is finished, so the first response a reader receives
        already carries the heading, the prose and the navigation.
      </p>
      <img
        src="/img/toolchain.png"
        alt="Three HTML entry files feeding a build step that writes three finished documents."
        width="1200"
        height="630"
      />
      <h2>Why the distinction matters</h2>
      <p>
        A dependency list is not a rendering strategy. React and Vite appear in this manifest exactly as they do in
        the client-rendered fixture stored beside it, so a profiler that reads only the manifest reaches the same
        conclusion about both projects. What separates them is what the server actually sends, and the only way to
        know that is to look at a capture.
      </p>
      <p>
        The <a href="/about">about page</a> describes how one route becomes one file, and the{' '}
        <a href="/changelog">changelog</a> records what changed in each release of the toolchain.
      </p>
      <p className="build" data-built="30 January 2026">Built 30 January 2026</p>
    </SiteChrome>
  );
}
