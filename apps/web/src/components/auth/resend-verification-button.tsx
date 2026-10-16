'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { resendVerification } from '@/actions/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';

const COOLDOWN_SECONDS = 60;

/**
 * "Send the email again". Disabled for 60 s after a click so a double tap does not burn the API's
 * 3-per-15-minutes limit; a `RATE_LIMITED` answer shows the common message.
 */
export function ResendVerificationButton({
  variant = 'default',
}: {
  variant?: 'default' | 'outline';
}) {
  const t = useTranslations('auth.verify');
  const tCommon = useTranslations('common');
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => {
      setWait((seconds) => seconds - 1);
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [wait]);

  const onClick = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await resendVerification();
      if (result.ok) {
        setSent(true);
        setWait(COOLDOWN_SECONDS);
      } else setFailure(result);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant={variant} disabled={pending || wait > 0} onClick={onClick}>
        {t('resend')}
      </Button>
      {wait > 0 && (
        <p className="text-label text-muted-foreground">{t('resendWait', { seconds: wait })}</p>
      )}
      {sent && wait > 0 && (
        <Alert variant="success">
          <AlertDescription>{t('resent')}</AlertDescription>
        </Alert>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{tCommon(errorMessageKey(failure.code))}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
