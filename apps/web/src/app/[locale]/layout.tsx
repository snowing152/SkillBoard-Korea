import { APP_NAME } from '@skillboard/shared';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Sans_KR } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { RegisterServiceWorker } from '@/components/pwa/register-sw';
import { ZodLocale } from '@/components/zod-locale';
import { routing } from '@/i18n/routing';
import '../globals.css';

/**
 * Fonts (docs/design/README.md). IBM Plex Sans covers Latin and Cyrillic as one variable file per
 * subset, preloaded. IBM Plex Sans KR adds Hangul: Google serves it in small unicode-range slices,
 * and the browser fetches only the slices a page uses, so it is not preloaded (no `subsets` needed).
 * Both are self-hosted by next/font at build time; no request goes to Google from the browser.
 */
const plex = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-plex',
  display: 'swap',
});
const plexKr = IBM_Plex_Sans_KR({
  weight: ['400', '500', '600'],
  preload: false,
  variable: '--font-plex-kr',
  display: 'swap',
});

// Still required for static rendering of every locale at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
    description: t('tagline'),
  };
}

// `cover` lets the sticky bars pad themselves with env(safe-area-inset-bottom) on iPhones.
export const viewport: Viewport = { viewportFit: 'cover' };

export default async function LocaleLayout({ children }: { children: ReactNode }) {
  // Resolved by src/i18n/request.ts from the [locale] root param.
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${plex.variable} ${plexKr.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <ZodLocale />
          {children}
        </NextIntlClientProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
