import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * A multi-page build, not a single-page app.
 *
 * Each route is its own HTML entry, which is what makes the head authorable in
 * plain HTML: the title, the description, the canonical, the preview properties,
 * and the structured data of a page all live in the file named below, and no
 * client-side code touches them. `npm run build` then renders the matching React
 * page into the `<!--app-html-->` placeholder, so the document that leaves the
 * server is complete before any script runs.
 *
 * React is here to render the markup, not to own the document. That distinction
 * is invisible to a dependency-level framework detector, which is one of the
 * things this fixture is for: the profile reports the same framework as the
 * client-rendered fixture next door, and the findings are still nothing, because
 * they come from the captured bytes rather than from the dependency list.
 */
const entry = (name) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: entry('index.html'),
        about: entry('about.html'),
        changelog: entry('changelog.html'),
      },
    },
  },
  plugins: [react()],
});
