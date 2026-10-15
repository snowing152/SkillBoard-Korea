import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { PageContainer, PageHeader } from '@/components/ds/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.reset');
  return { title: t('requestTitle') };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth.reset');
  return (
    <PageContainer width="form">
      <PageHeader title={t('requestTitle')} description={t('requestBody')} />
      <div className="rounded-card bg-card p-4 sm:p-6">
        <ForgotPasswordForm />
      </div>
    </PageContainer>
  );
}
