import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignInForm } from '@/components/auth/sign-in-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signIn');
  return { title: t('title') };
}

// Phase D minimum: email + password only. Google, sign-up and verification come with the accounts spec.
export default async function SignInPage() {
  const t = await getTranslations('auth.signIn');
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SignInForm />
    </main>
  );
}
