import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// 3. Import Zod
import { z } from 'astro/zod';

// Collection für Landingpages
const landing = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/landing',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = {
  landing
};
