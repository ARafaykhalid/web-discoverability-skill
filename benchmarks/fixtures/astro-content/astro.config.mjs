import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// `site` is the only place this project states its own origin. Absolute
// canonicals, absolute og:url values and absolute sitemap entries are all derived
// from it, so the trailing slash it carries here reaches every one of them.
//
// The value is written the way a real project writes it - a bare origin with a
// closing slash - which is harmless on its own. What matters is how each template
// joins a path onto it: `new URL(path, Astro.site)` resolves the slash away, while
// string interpolation does not. src/pages/docs/[...slug].astro does the latter.
export default defineConfig({
  site: 'https://example.com/',
  trailingSlash: 'never',
  build: { format: 'file' },
  // No `filter` is passed, so the integration lists every route the build emits,
  // including the draft entry that src/layouts/BaseLayout.astro serves as noindex.
  integrations: [sitemap()],
});
