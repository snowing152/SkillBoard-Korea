import { DEFAULT_TIME_ZONE } from '@skillboard/shared';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { loadMessages } from './messages';
import { routing } from './routing';

// next-intl 4.14+ reads the `[locale]` segment through Next's root params (Next 16.3+),
// so pages no longer call setRequestLocale. The proxy guarantees a known locale prefix.
export default getRequestConfig(async () => {
  const requested = await rootParams.locale();
  if (!hasLocale(routing.locales, requested)) notFound();

  return {
    locale: requested,
    messages: await loadMessages(requested),
    // Store UTC, display KST (ADR 0017).
    timeZone: DEFAULT_TIME_ZONE,
  };
});
