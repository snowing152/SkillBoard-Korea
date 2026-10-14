/**
 * Reference lists for talent profiles. They are config, not tables, because they change rarely, need no
 * admin UI, and the web needs them at build time for filters (docs/domain.md). Labels are UI strings:
 * `apps/web/messages/<locale>/reference.json` keyed by these codes. Language names come from
 * `Intl.DisplayNames`, so they need no translation files.
 */

/** Korean top-level regions (special/metropolitan cities and provinces). */
export const CITY_CODES = [
  'SEOUL',
  'BUSAN',
  'INCHEON',
  'DAEGU',
  'DAEJEON',
  'GWANGJU',
  'ULSAN',
  'SEJONG',
  'GYEONGGI',
  'GANGWON',
  'CHUNGBUK',
  'CHUNGNAM',
  'JEONBUK',
  'JEONNAM',
  'GYEONGBUK',
  'GYEONGNAM',
  'JEJU',
] as const;
export type CityCode = (typeof CITY_CODES)[number];

/** Self-declared, optional (ADR 0018). `UNDISCLOSED` is a real choice, not the same as null. */
export const VISA_TYPES = [
  'F-2',
  'F-4',
  'F-5',
  'F-6',
  'E-7',
  'D-10',
  'D-2',
  'H-1',
  'OTHER',
  'UNDISCLOSED',
] as const;
export type VisaType = (typeof VISA_TYPES)[number];

export const WORK_MODES = ['REMOTE', 'ON_SITE', 'HYBRID'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const LANGUAGE_LEVELS = ['NATIVE', 'FLUENT', 'INTERMEDIATE', 'BASIC'] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

/** Drives visibility (docs/domain.md): public iff PUBLISHED and not hidden by an admin. */
export const PROFILE_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const CONTACT_TYPES = ['EMAIL', 'TELEGRAM', 'KAKAO'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

/** ISO 639-1 codes a talent can list. Ordered by expected frequency among foreigners in Korea. */
export const LANGUAGE_CODES = [
  'en',
  'ko',
  'ru',
  'uz',
  'kk',
  'ky',
  'tg',
  'mn',
  'zh',
  'ja',
  'vi',
  'th',
  'tl',
  'id',
  'ms',
  'my',
  'km',
  'ne',
  'hi',
  'ur',
  'bn',
  'si',
  'ar',
  'fa',
  'tr',
  'uk',
  'de',
  'fr',
  'es',
  'pt',
  'it',
  'pl',
] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

/** One place for the limits so the form hints, the schema and the docs cannot disagree. */
export const TALENT_PROFILE_LIMITS = {
  headlineMin: 3,
  headlineMax: 80,
  descriptionMin: 20,
  descriptionMax: 2000,
  skillsMax: 10,
  languagesMax: 10,
  portfolioLinksMax: 5,
  portfolioLabelMax: 60,
  contactMethodsMax: 3,
  contactValueMax: 120,
} as const;
