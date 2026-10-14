import { z } from 'zod';

/**
 * The single list of UI languages (ADR 0008). Adding a language = add it here + add
 * `apps/web/messages/<locale>/`. Nothing else changes.
 */
export const LOCALES = ['en', 'ko', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LocaleSchema = z.enum(LOCALES);

/** Users are in Korea: store UTC, display in KST by default (ADR 0017). */
export const DEFAULT_TIME_ZONE = 'Asia/Seoul';

/**
 * Translated names stored as data (`Skill.names`, `SkillCategory.names`): `{ en, ko, ru, … }`.
 * Only `en` is required so that adding a UI language never breaks existing rows; the UI falls back
 * to English with `localizedName()`.
 */
export const LocalizedNamesSchema = z
  .object({ en: z.string().min(1).max(100) })
  .catchall(z.string().max(100));
export type LocalizedNames = z.infer<typeof LocalizedNamesSchema>;

export function localizedName(names: LocalizedNames, locale: string): string {
  return names[locale] ?? names.en;
}
