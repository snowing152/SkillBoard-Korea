import { PAGINATION_DEFAULT_LIMIT } from '@skillboard/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { UsersIcon } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/ds/page';
import { EmptyState } from '@/components/ds/states';
import { TalentCard } from '@/components/talent-profile/talent-card';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

type Props = { searchParams: Promise<{ cursor?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile.list');
  return { title: t('title') };
}

/**
 * Public list with cursor pagination (ADR 0017): "Load more" is a plain link carrying `?cursor=`, so it
 * works without JavaScript and is a starting point for the search spec's filters.
 */
export default async function TalentsPage({ searchParams }: Props) {
  const t = await getTranslations('profile.list');
  const { cursor } = await searchParams;
  const { data, error } = await api.GET('/v1/talents', {
    params: { query: { limit: PAGINATION_DEFAULT_LIMIT, ...(cursor ? { cursor } : {}) } },
  });
  if (!data) {
    const failure = toActionFailure(error);
    throw new Error(`API ${failure.code} (request ${failure.requestId ?? 'unknown'})`);
  }

  return (
    <PageContainer>
      <PageHeader title={t('title')} />
      {data.items.length === 0 ? (
        <EmptyState icon={<UsersIcon />} title={t('empty')} />
      ) : (
        <ul className="flex flex-col gap-stack">
          {data.items.map((talent) => (
            <li key={talent.id}>
              <TalentCard talent={talent} />
            </li>
          ))}
        </ul>
      )}
      {data.nextCursor && (
        <Link
          href={{ pathname: '/talents', query: { cursor: data.nextCursor } }}
          className={cn(buttonVariants({ variant: 'outline' }), 'self-center')}
        >
          {t('more')}
        </Link>
      )}
    </PageContainer>
  );
}
