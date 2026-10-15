'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type Login, LoginSchema } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from '@/actions/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';

const NEXT_AFTER_SIGN_IN = '/me/talent-profile';

/**
 * Pattern for every form: react-hook-form + zodResolver with the shared schema (same rules as the API),
 * submit through a Server Action, show API failures by error code. Field messages come from Zod
 * (translated by <ZodLocale />), never from the API message.
 */
export function SignInForm() {
  const t = useTranslations('auth.signIn');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Login>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    setFailure(null);
    startTransition(async () => {
      const result = await signIn(values);
      if (result.ok) {
        router.push(
          result.data.pendingConsents.length > 0
            ? `/consent?next=${encodeURIComponent(NEXT_AFTER_SIGN_IN)}`
            : NEXT_AFTER_SIGN_IN,
        );
      } else setFailure(result);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && (
          <p role="alert" className="text-label font-medium text-danger">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && (
          <p role="alert" className="text-label font-medium text-danger">
            {errors.password.message}
          </p>
        )}
      </div>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>
            {failure.code === 'UNAUTHENTICATED'
              ? t('invalidCredentials')
              : tCommon(errorMessageKey(failure.code))}
          </AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {t('submit')}
      </Button>
    </form>
  );
}
