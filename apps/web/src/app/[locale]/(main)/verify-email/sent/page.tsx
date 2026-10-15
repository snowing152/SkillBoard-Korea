import { MailIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ResendVerificationButton } from '@/components/auth/resend-verification-button';
import { PageContainer, PageHeader } from '@/components/ds/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.verify');
  return { title: t('sentTitle') };
}

/** Where sign-up ends. The mail is already on its way; the button asks for another one. */
export default async function VerifyEmailSentPage() {
  const t = await getTranslations('auth.verify');
  return (
    <PageContainer width="form">
      <PageHeader title={t('sentTitle')} description={t('sentBody')} />
      <div className="flex flex-col items-start gap-4 rounded-card bg-card p-4 sm:p-6">
        <MailIcon aria-hidden="true" className="size-8 text-primary" />
        <ResendVerificationButton />
      </div>
    </PageContainer>
  );
}
