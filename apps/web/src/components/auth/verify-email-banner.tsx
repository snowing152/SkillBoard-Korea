import { MailWarningIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ResendVerificationButton } from '@/components/auth/resend-verification-button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Shown on every `/me/*` page while the email is unverified. On the profile page, when the profile is
 * already published, the text says what verifying changes: the profile goes live.
 */
export async function VerifyEmailBanner({ variant }: { variant: 'default' | 'goLive' }) {
  const t = await getTranslations('auth.verify');
  return (
    <div className="mx-auto w-full max-w-content px-gutter pt-6">
      <Alert variant="warning" className="gap-3">
        <MailWarningIcon aria-hidden="true" />
        <AlertDescription className="flex flex-col gap-3">
          <span>{variant === 'goLive' ? t('goLive') : t('bannerText')}</span>
          <ResendVerificationButton variant="outline" />
        </AlertDescription>
      </Alert>
    </div>
  );
}
