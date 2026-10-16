import { SIGNUP_ROLES } from '@skillboard/shared';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { GoogleSignUpForm } from '@/components/auth/google-sign-up-form';
import { PageContainer, PageHeader } from '@/components/ds/page';
import { redirect } from '@/i18n/navigation';
import { safeNextPath } from '@/lib/safe-path';
import { GOOGLE_SIGNUP_COOKIE } from '@/lib/session-cookies';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.googleSignUp');
  return { title: t('title') };
}

/**
 * Where "Continue with Google" lands for a Google user who has no account yet. Without the cookie the
 * callback sets there is nothing to finish, so the visitor is sent to the normal sign-up page.
 */
export default async function GoogleSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; role?: string | string[] }>;
}) {
  const t = await getTranslations('auth.googleSignUp');
  const store = await cookies();
  if (!store.has(GOOGLE_SIGNUP_COOKIE)) {
    redirect({ href: '/sign-up', locale: await getLocale() });
  }
  const { next, role } = await searchParams;
  return (
    <PageContainer width="form">
      <PageHeader title={t('title')} description={t('intro')} />
      <div className="rounded-card bg-card p-4 sm:p-6">
        <GoogleSignUpForm
          next={safeNextPath(next, '') || undefined}
          // The role picked on /sign-up, preselected; the box below is still unticked.
          initialRole={SIGNUP_ROLES.find((r) => r === role) ?? 'TALENT'}
        />
      </div>
    </PageContainer>
  );
}
