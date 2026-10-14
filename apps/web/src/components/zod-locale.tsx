'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { z } from 'zod';

/**
 * Makes Zod's built-in validation messages (min, max, email, url…) follow the UI language in the
 * browser, so form field errors are translated without a key per rule. Only Zod's custom `refine`
 * issues need their own message keys (see talent-profile-form.tsx). A locale without a Zod pack keeps
 * English, so adding a UI language still needs no code change here.
 */
const ZOD_LOCALES: Partial<Record<string, () => z.core.$ZodConfig>> = {
  en: z.locales.en,
  ko: z.locales.ko,
  ru: z.locales.ru,
};

export function ZodLocale() {
  const locale = useLocale();
  useEffect(() => {
    z.config((ZOD_LOCALES[locale] ?? z.locales.en)());
  }, [locale]);
  return null;
}
