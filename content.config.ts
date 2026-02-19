import { defineCollection, z } from 'astro:content';

// Collection für Landingpages
const landingCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // weitere Felder, die jede Landingpage haben soll
  }),
});

export const collections = {
  landing: landingCollection,
};
