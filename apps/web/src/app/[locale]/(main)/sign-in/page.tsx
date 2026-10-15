import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { GoogleLink, OrDivider } from '@/components/auth/google-button';
import { googleStartUrl } from '@/components/auth/google-url';
import { SignInForm } from '@/components/auth/sign-in-form';
import { TermsLink } from '@/components/auth/terms-link';
import { PageContainer, PageHeader } from '@/components/ds/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { env } from '@/env';
import { Link } from '@/i18n/navigation';
import { oauthErrorKey } from '@/lib/oauth-error';
import { safeNextPath } from '@/lib/safe-path';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signIn');
  return { title: t('title') };
}

type SearchParams = Promise<{ next?: string | string[]; error?: string | string[] }>;

/**
 * Email + password, or Google. `?next=` (validated) is honoured after sign-in; `?error=` is the code the
 * Google callback left (`/auth/callback`), shown as a translated message and nothing else.
 */
export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('auth.signIn');
  const tAuth = await getTranslations('auth');
  const locale = await getLocale();
  const params = await searchParams;
  const next = safeNextPath(params.next, '') || undefined;
  const errorKey = params.error === undefined ? null : oauthErrorKey(params.error);
  const googleEnabled = env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

  return (
    <PageContainer width="form">
      <PageHeader title={t('title')} />
      {errorKey && (
        <Alert variant="destructive">
          <AlertDescription>{tAuth(`errors.${errorKey}`)}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-4 rounded-card bg-card p-4 sm:p-6">
        <SignInForm next={next} />
        {googleEnabled && (
          <>
            <OrDivider />
            <GoogleLink
              href={googleStartUrl(env.NEXT_PUBLIC_API_URL, { role: 'CLIENT', locale, next })}
            />
            <p className="text-label text-muted-foreground">
              {t.rich('googleNotice', {
                terms: (chunks) => <TermsLink href="/legal/terms">{chunks}</TermsLink>,
                privacy: (chunks) => <TermsLink href="/legal/privacy">{chunks}</TermsLink>,
              })}
            </p>
          </>
        )}
      </div>
      <p className="text-center text-body-sm text-foreground-secondary">
        {t('noAccount')}{' '}
        <Link href="/sign-up" className="font-medium text-primary underline">
          {t('signUpLink')}
        </Link>
      </p>
    </PageContainer>
  );
}
