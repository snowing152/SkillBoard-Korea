'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type PasswordResetRequest, PasswordResetRequestSchema } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { requestPasswordReset } from '@/actions/auth';
import { TextField } from '@/components/auth/auth-fields';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';

/** Always the same success text, whether or not the address has an account (no enumeration). */
export function ForgotPasswordForm() {
  const t = useTranslations('auth.reset');
  const tCommon = useTranslations('common');
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequest>({
    resolver: zodResolver(PasswordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) => {
    setFailure(null);
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (result.ok) setSent(true);
      else setFailure(result);
    });
  });

  if (sent) {
    return (
      <Alert variant="success">
        <AlertDescription>{t('sent')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="email"
        label={t('email')}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{tCommon(errorMessageKey(failure.code))}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {t('requestSubmit')}
      </Button>
    </form>
  );
}
