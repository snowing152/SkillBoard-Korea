'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ChangePassword, ChangePasswordSchema } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { changePassword, sendSetPasswordLink } from '@/actions/account';
import { TextField } from '@/components/auth/auth-fields';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';

/**
 * Two shapes: an account with a password changes it; a Google-only account (`hasPassword: false`) gets
 * "set a password", which is the reset flow by email (the person proves they own the inbox first).
 */
export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  return hasPassword ? <ChangePasswordForm /> : <SetPasswordLink />;
}

function ChangePasswordForm() {
  const t = useTranslations('account.password');
  const tCommon = useTranslations('common');
  const [changed, setChanged] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePassword>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const onSubmit = handleSubmit((values) => {
    setFailure(null);
    setChanged(false);
    startTransition(async () => {
      const result = await changePassword(values);
      if (result.ok) {
        setChanged(true);
        reset();
      } else setFailure(result);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="currentPassword"
        label={t('current')}
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <TextField
        id="newPassword"
        label={t('new')}
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      {changed && (
        <Alert variant="success">
          <AlertDescription>{t('changed')}</AlertDescription>
        </Alert>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>
            {failure.reason === 'WRONG_PASSWORD'
              ? t('wrong')
              : failure.reason === 'NO_PASSWORD_SET'
                ? t('googleOnly')
                : tCommon(errorMessageKey(failure.code))}
          </AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {t('change')}
      </Button>
    </form>
  );
}

function SetPasswordLink() {
  const t = useTranslations('account.password');
  const tCommon = useTranslations('common');
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await sendSetPasswordLink();
      if (result.ok) setSent(true);
      else setFailure(result);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-foreground-secondary">{t('googleOnly')}</p>
      {sent && (
        <Alert variant="success">
          <AlertDescription>{t('linkSent')}</AlertDescription>
        </Alert>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{tCommon(errorMessageKey(failure.code))}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={onClick}
        className="self-start"
      >
        {t('sendSetLink')}
      </Button>
    </div>
  );
}
