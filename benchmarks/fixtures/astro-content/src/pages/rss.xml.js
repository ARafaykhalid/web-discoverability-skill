import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

// The feed is built from the same collection the pages are, minus the drafts. It is
// emitted to dist/rss.xml at build time, which is why the feed the checks read is
// the copy pinned at the fixture root rather than this module.
export async function GET(context) {
  const entries = (await getCollection('docs')).filter((entry) => !entry.data.draft);
  return rss({
    title: 'Example Docs',
    description: 'Notes on how this documentation set is built.',
    site: context.site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description ?? entry.data.title,
      link: `/docs/${entry.id}`,
      pubDate: entry.data.updated,
    })),
  });
}
