'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { confirmGoogleLink } from '@/actions/google';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';
import { defaultLandingPath } from '@/lib/auth-forms';
import { cn } from '@/lib/utils';

/**
 * The confirmation before Google joins an existing account. Linking removes the password and signs every
 * other session out, so it happens only when this button is pressed (a POST), never during the redirect.
 */
export function GoogleLinkForm({ next }: { next?: string | undefined }) {
  const t = useTranslations('auth.googleLink');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await confirmGoogleLink();
      if (!result.ok) {
        setFailure(result);
        return;
      }
      const target = next ?? defaultLandingPath(result.data.roles);
      router.push(
        result.data.pendingConsents.length > 0
          ? `/consent?next=${encodeURIComponent(target)}`
          : target,
        { locale: result.data.locale },
      );
    });
  };

  const finished = failure?.code === 'NOT_FOUND' || failure?.code === 'CONFLICT';
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Alert>
        <AlertDescription>{t('warning')}</AlertDescription>
      </Alert>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>
            {failure.code === 'NOT_FOUND'
              ? t('expired')
              : failure.code === 'CONFLICT'
                ? t('alreadyLinked')
                : tCommon(errorMessageKey(failure.code))}
          </AlertDescription>
        </Alert>
      )}
      {!finished && (
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {t('submit')}
        </Button>
      )}
      <Link
        href="/sign-in"
        className={cn(buttonVariants({ variant: finished ? 'default' : 'outline', size: 'lg' }))}
      >
        {t('cancel')}
      </Link>
    </form>
  );
}
