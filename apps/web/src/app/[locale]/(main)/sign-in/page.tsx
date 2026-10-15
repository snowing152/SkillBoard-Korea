import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignInForm } from '@/components/auth/sign-in-form';
import { PageContainer, PageHeader } from '@/components/ds/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signIn');
  return { title: t('title') };
}

// Phase D minimum: email + password only. Google, sign-up and verification come with the accounts spec.
export default async function SignInPage() {
  const t = await getTranslations('auth.signIn');
  return (
    <PageContainer width="form">
      <PageHeader title={t('title')} />
      <div className="rounded-card bg-card p-4 sm:p-6">
        <SignInForm />
      </div>
    </PageContainer>
  );
}
