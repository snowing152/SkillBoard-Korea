import { MailWarningIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ResetPasswordFormView } from '@/components/auth/reset-password-form';
import { PageContainer, PageHeader } from '@/components/ds/page';
import { ErrorState } from '@/components/ds/states';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.reset');
  return { title: t('title') };
}

/** Landing page of the reset email. Without a token in the URL there is nothing to reset. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const t = await getTranslations('auth.reset');
  const { token } = await searchParams;

  if (typeof token !== 'string' || token.length === 0) {
    return (
      <PageContainer width="form">
        <ErrorState
          as="h1"
          icon={<MailWarningIcon />}
          title={t('expired')}
          action={
            <Link href="/forgot-password" className={buttonVariants({ size: 'lg' })}>
              {t('expiredAction')}
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="form">
      <PageHeader title={t('title')} />
      <div className="rounded-card bg-card p-4 sm:p-6">
        <ResetPasswordFormView token={token} />
      </div>
    </PageContainer>
  );
}
