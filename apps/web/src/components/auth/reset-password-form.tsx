'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { confirmPasswordReset } from '@/actions/auth';
import { TextField } from '@/components/auth/auth-fields';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';
import { type ResetPasswordForm, ResetPasswordFormSchema } from '@/lib/auth-forms';

export function ResetPasswordFormView({ token }: { token: string }) {
  const t = useTranslations('auth.reset');
  const tCommon = useTranslations('common');
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(ResetPasswordFormSchema),
    defaultValues: { password: '', repeat: '' },
  });

  const onSubmit = handleSubmit((values) => {
    setFailure(null);
    startTransition(async () => {
      const result = await confirmPasswordReset({ token, password: values.password });
      if (result.ok) setDone(true);
      else setFailure(result);
    });
  });

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">
          <AlertDescription>{t('success')}</AlertDescription>
        </Alert>
        <Link href="/sign-in" className={buttonVariants({ size: 'lg' })}>
          {t('backToSignIn')}
        </Link>
      </div>
    );
  }

  // A `custom` issue from our own refine is mapped to our key; Zod's built-ins are already translated.
  const repeatError = errors.repeat?.type === 'custom' ? t('mismatch') : errors.repeat?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="password"
        label={t('newPassword')}
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <TextField
        id="repeat"
        label={t('repeatPassword')}
        type="password"
        autoComplete="new-password"
        error={repeatError}
        {...register('repeat')}
      />
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>
            {failure.code === 'NOT_FOUND' ? t('expired') : tCommon(errorMessageKey(failure.code))}
          </AlertDescription>
        </Alert>
      )}
      {failure?.code === 'NOT_FOUND' && (
        <Link href="/forgot-password" className={buttonVariants({ variant: 'outline' })}>
          {t('expiredAction')}
        </Link>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {t('submit')}
      </Button>
    </form>
  );
}
