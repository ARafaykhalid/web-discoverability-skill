import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * Two HTML entry points, one client router inside each.
 *
 * `index.html` serves the marketing routes and `handbook.html` serves the
 * documentation section. That split is why the capture in this fixture holds two
 * different app shells rather than one, and it is what lets the fixture show both
 * halves of the canonical-mutation defect: the marketing shell ships no canonical
 * at all, while the handbook shell hard-codes the section root and the router then
 * overwrites it per article.
 *
 * There is no pre-render, no SSG plugin, and no server. Every entry is an empty
 * div that React fills in after the module graph has loaded and executed.
 */
const entry = (name) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: entry('index.html'),
        handbook: entry('handbook.html'),
      },
    },
  },
});
