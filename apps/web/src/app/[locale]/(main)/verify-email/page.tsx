import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { VerifyEmailConfirm } from '@/components/auth/verify-email-confirm';
import { PageContainer } from '@/components/ds/page';
import { getAccessToken } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.verify');
  return { title: t('confirming') };
}

/** Landing page of the link in the verification email. The token is spent by the client component. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const signedIn = (await getAccessToken()) !== null;
  return (
    <PageContainer width="form">
      <VerifyEmailConfirm token={typeof token === 'string' ? token : null} signedIn={signedIn} />
    </PageContainer>
  );
}
