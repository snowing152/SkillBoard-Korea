import { z } from 'zod';
import { LocalizedNamesSchema } from '../i18n/locales.js';

/** A skill as embedded in profiles and search results. */
export const SkillRefSchema = z.object({
  id: z.uuid(),
  slug: z.string().max(60),
  names: LocalizedNamesSchema,
});
export type SkillRef = z.infer<typeof SkillRefSchema>;

export const SkillCategorySchema = z.object({
  id: z.uuid(),
  slug: z.string().max(60),
  names: LocalizedNamesSchema,
  skills: z.array(SkillRefSchema),
});
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

/** `GET /v1/skills`: the whole catalog, grouped. Small and cached by clients, so no pagination. */
export const SkillCatalogSchema = z.object({
  categories: z.array(SkillCategorySchema),
});
export type SkillCatalog = z.infer<typeof SkillCatalogSchema>;
