import { DEFAULT_LOCALE, LOCALES } from '@skillboard/shared';
import { defineRouting } from 'next-intl/routing';

// The locale list lives in packages/shared (ADR 0008); this file only wires it into next-intl.
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // English has no prefix (/search), other languages do (/ko/search, /ru/search).
  localePrefix: 'as-needed',
});
