'use client';

import { TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/ds/page';
import { ErrorState } from '@/components/ds/states';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';

/** Catches errors thrown by any page under the locale layout (API down, unexpected error code). */
export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common.errorPage');
  return (
    <AppShell>
      <PageContainer>
        <ErrorState
          as="h1"
          icon={<TriangleAlertIcon />}
          title={t('title')}
          body={t('body')}
          action={
            <Button type="button" onClick={reset}>
              {t('retry')}
            </Button>
          }
        />
      </PageContainer>
    </AppShell>
  );
}
