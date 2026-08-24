import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderPage, PAGES } from '../.ssr-build/entry-server.js';

/**
 * Replace the placeholder in each built HTML file with rendered markup.
 *
 * `vite build` leaves `dist/<name>.html` containing the head that was authored in
 * the source entry plus an untouched `<!--app-html-->`. This step renders the
 * matching page component to a string and substitutes it, so every document in
 * `dist/` carries its own heading and prose before it is ever served.
 *
 * The head is not touched here on purpose. Metadata that a build step invents is
 * metadata nobody can find by reading the repository, and the whole point of the
 * multi-page setup is that the head is a file somebody can open.
 */
const PLACEHOLDER = '<!--app-html-->';
const dist = (name) => fileURLToPath(new URL(`../dist/${name}.html`, import.meta.url));

for (const name of PAGES) {
  const file = dist(name);
  const shell = readFileSync(file, 'utf8');
  if (!shell.includes(PLACEHOLDER)) {
    throw new Error(`${name}.html has no ${PLACEHOLDER} placeholder; the entry was edited without updating this script`);
  }
  writeFileSync(file, shell.replace(PLACEHOLDER, renderPage(name)), 'utf8');
  process.stdout.write(`pre-rendered ${name}.html\n`);
}
