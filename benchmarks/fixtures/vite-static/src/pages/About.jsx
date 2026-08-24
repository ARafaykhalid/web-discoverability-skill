import SiteChrome from '../components/SiteChrome.jsx';

/**
 * The about page body: an explanation of the build, written on the page it
 * describes so the documentation and the mechanism cannot drift apart.
 */
export default function About() {
  return (
    <SiteChrome>
      <h1>How one route becomes one file</h1>
      <p>
        There are three steps and none of them is clever. First, <code>vite build</code> reads the three entries
        listed in the config and writes a copy of each into <code>dist/</code>, rewriting the stylesheet reference to
        the hashed file it emitted. Second, a second Vite build compiles the page components for Node. Third, a short
        script walks the built documents and replaces the placeholder in each one with the markup its component
        renders.
      </p>
      <img
        src="/img/entries.png"
        alt="A source entry with an empty placeholder above the same document with rendered markup in its place."
        width="1200"
        height="630"
      />
      <h2>What is deliberately not automated</h2>
      <p>
        The head is never touched by the build. A canonical URL that a script derives from a file path is correct
        until somebody moves the file, and then it is silently wrong; a canonical URL typed into the entry is wrong
        immediately and loudly, which is the failure mode worth having. The same reasoning applies to the title, the
        description and the preview properties.
      </p>
      <h2>Making a correction</h2>
      <p>
        Edit the entry for prose in the head, or the component under <code>src/pages/</code> for prose in the body,
        and run the build. Because each route is its own document, a change to one page cannot alter another, which
        is the property that makes the output reviewable.
      </p>
    </SiteChrome>
  );
}
