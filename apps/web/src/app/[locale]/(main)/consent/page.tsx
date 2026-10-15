import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageContainer, PageHeader } from '@/components/ds/page';
import { ConsentForm } from '@/components/legal/consent-form';
import { redirect } from '@/i18n/navigation';
import { apiAsUser } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';
import { safeNextPath } from '@/lib/safe-path';
import { redirectToSignIn } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.consent');
  return { title: t('title') };
}

const DEFAULT_NEXT = '/me/talent-profile';

/**
 * Collects the document versions the user has not accepted yet. Outside `/me` on purpose: the `/me`
 * layout redirects here, so living under it would loop. Nothing pending → straight on to `next`.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const t = await getTranslations('legal.consent');
  const client = await apiAsUser();
  if (!client) return redirectToSignIn();

  const { next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext, DEFAULT_NEXT);

  const { data, error } = await client.GET('/v1/me/consents');
  if (!data) {
    const failure = toActionFailure(error);
    if (failure.code === 'UNAUTHENTICATED') return redirectToSignIn();
    throw new Error(`API ${failure.code} (request ${failure.requestId ?? 'unknown'})`);
  }
  if (data.pending.length === 0) {
    redirect({ href: next, locale: await getLocale() });
  }

  return (
    <PageContainer width="form">
      <PageHeader title={t('title')} description={t('intro')} />
      <ConsentForm pending={data.pending} next={next} />
    </PageContainer>
  );
}
