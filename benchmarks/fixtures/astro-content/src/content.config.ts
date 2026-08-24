import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// `description` is optional in the schema, which is why the build accepts an entry
// that omits it. The layout has no fallback for that case, so the omission travels
// all the way to the served head: src/content/docs/deploying.md is the entry that
// exercises it.
const docs = defineCollection({
  loader: glob({ base: './src/content/docs', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { docs };
