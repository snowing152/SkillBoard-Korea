'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ds/states';

/** After this long, say that the free-tier API is waking up (ADR 0013: 30–60 s cold starts). */
const WAKING_UP_AFTER_MS = 4000;

/**
 * Loading placeholder for `loading.tsx`: a skeleton of a title and cards plus a screen-reader
 * status. If loading takes longer than a few seconds, a visible line explains the cold start.
 */
export function LoadingState({ cards = 2 }: { cards?: number }) {
  const t = useTranslations('common');
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSlow(true);
    }, WAKING_UP_AFTER_MS);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className={slow ? 'text-body-sm text-foreground-secondary' : 'sr-only'}>
        {slow ? t('wakingUp') : t('loading')}
      </p>
      <Skeleton className="h-8 w-2/3" />
      {Array.from({ length: cards }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-card" />
      ))}
    </div>
  );
}
