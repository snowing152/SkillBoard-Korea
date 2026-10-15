import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { PageContainer, PageHeader } from '@/components/ds/page';
import { env } from '@/env';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signUp');
  return { title: t('title') };
}

/** Role, name, email, password and one consent box; Google below when the API has it configured. */
export default async function SignUpPage() {
  const t = await getTranslations('auth.signUp');
  const googleBase =
    env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' ? env.NEXT_PUBLIC_API_URL : null;
  return (
    <PageContainer width="form">
      <PageHeader title={t('title')} />
      <div className="rounded-card bg-card p-4 sm:p-6">
        <SignUpForm googleBase={googleBase} />
      </div>
    </PageContainer>
  );
}
