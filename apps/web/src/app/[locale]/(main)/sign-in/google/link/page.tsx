import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { GoogleLinkForm } from '@/components/auth/google-link-form';
import { PageContainer, PageHeader } from '@/components/ds/page';
import { redirect } from '@/i18n/navigation';
import { safeNextPath } from '@/lib/safe-path';
import { GOOGLE_LINK_COOKIE } from '@/lib/session-cookies';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.googleLink');
  return { title: t('title') };
}

/**
 * Where "Continue with Google" lands when the Google email belongs to an existing account (ADR 0025).
 * Without the cookie the callback sets there is nothing to confirm, so the visitor goes to sign-in.
 */
export default async function GoogleLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const t = await getTranslations('auth.googleLink');
  const store = await cookies();
  if (!store.has(GOOGLE_LINK_COOKIE)) {
    redirect({ href: '/sign-in', locale: await getLocale() });
  }
  const { next } = await searchParams;
  return (
    <PageContainer width="form">
      <PageHeader title={t('title')} description={t('intro')} />
      <div className="rounded-card bg-card p-4 sm:p-6">
        <GoogleLinkForm next={safeNextPath(next, '') || undefined} />
      </div>
    </PageContainer>
  );
}
