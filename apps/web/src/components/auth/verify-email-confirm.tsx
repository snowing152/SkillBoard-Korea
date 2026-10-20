'use client';

import { CircleCheckIcon, MailWarningIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { confirmEmail } from '@/actions/auth';
import { EmptyState, ErrorState } from '@/components/ds/states';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

type Phase = 'confirming' | 'done' | 'expired' | 'failed';

/**
 * Confirms on mount, once. The link in the email only opens this page; the token is spent by a POST from
 * here, so a mail scanner that fetches the URL cannot burn it. The ref guards React's dev double-effect.
 */
export function VerifyEmailConfirm({
  token,
  signedIn,
}: {
  token: string | null;
  signedIn: boolean;
}) {
  const t = useTranslations('auth.verify');
  const tCommon = useTranslations('common');
  const [phase, setPhase] = useState<Phase>(token ? 'confirming' : 'expired');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void confirmEmail({ token }).then((result) => {
      if (result.ok) setPhase('done');
      else setPhase(result.code === 'NOT_FOUND' ? 'expired' : 'failed');
    });
  }, [token]);

  if (phase === 'confirming') {
    return (
      <p role="status" className="text-body text-foreground-secondary">
        {t('confirming')}
      </p>
    );
  }
  if (phase === 'done') {
    return (
      <EmptyState
        as="h1"
        icon={<CircleCheckIcon />}
        title={t('successTitle')}
        body={t('successBody')}
        action={
          <Link
            href={signedIn ? '/me/talent-profile' : '/sign-in'}
            className={buttonVariants({ size: 'lg' })}
          >
            {signedIn ? t('continueSignedIn') : t('continueSignedOut')}
          </Link>
        }
      />
    );
  }
  if (phase === 'expired') {
    return (
      <ErrorState
        as="h1"
        icon={<MailWarningIcon />}
        title={t('expired')}
        action={
          <Link href="/verify-email/sent" className={buttonVariants({ size: 'lg' })}>
            {t('expiredAction')}
          </Link>
        }
      />
    );
  }
  return <ErrorState as="h1" title={tCommon('errors.INTERNAL')} />;
}
