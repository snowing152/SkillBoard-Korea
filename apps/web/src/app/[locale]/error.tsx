'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/** Catches errors thrown by any page under the locale layout (API down, unexpected error code). */
export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common.errorPage');
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
      <Button type="button" onClick={reset} className="min-h-11 self-start">
        {t('retry')}
      </Button>
    </main>
  );
}
