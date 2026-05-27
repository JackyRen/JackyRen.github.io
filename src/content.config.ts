import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const language = z.enum(['zh', 'en']);

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        date: z.coerce.date().optional(),
        author: z.string().default('Jacky Ren'),
        keywords: z.array(z.string()).default([]),
        lang: language.optional(),
        originalLang: language.optional(),
        translationOf: z.string().optional(),
        canonicalId: z.string().optional(),
        updatedDate: z.coerce.date().optional(),
      }),
    }),
  }),
};
