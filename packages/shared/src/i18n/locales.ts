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
