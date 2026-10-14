import { APP_NAME } from '@skillboard/shared';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { RegisterServiceWorker } from '@/components/pwa/register-sw';
import { ZodLocale } from '@/components/zod-locale';
import { routing } from '@/i18n/routing';
import '../globals.css';

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

export default async function LocaleLayout({ children }: { children: ReactNode }) {
  // Resolved by src/i18n/request.ts from the [locale] root param.
  const locale = await getLocale();

  return (
    <html lang={locale}>
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
