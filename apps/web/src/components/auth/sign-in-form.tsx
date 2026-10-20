'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type Login, LoginSchema } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from '@/actions/auth';
import { TextField } from '@/components/auth/auth-fields';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';
import { defaultLandingPath } from '@/lib/auth-forms';

type Props = {
  /** Already validated with `SafePathSchema` by the page; honoured after a successful sign-in. */
  next?: string | undefined;
};

/**
 * Pattern for every form: react-hook-form + zodResolver with the shared schema (same rules as the API),
 * submit through a Server Action, show API failures by error code. Field messages come from Zod
 * (translated by <ZodLocale />), never from the API message.
 */
export function SignInForm({ next }: Props) {
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
      if (!result.ok) {
        setFailure(result);
        return;
      }
      const target = next ?? defaultLandingPath(result.data.roles);
      // The user's stored language wins over the page they happened to sign in from.
      router.push(
        result.data.pendingConsents.length > 0
          ? `/consent?next=${encodeURIComponent(target)}`
          : target,
        { locale: result.data.locale },
      );
    });
  });

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
      <TextField
        id="password"
        label={t('password')}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
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
      <Link href="/forgot-password" className="text-center text-body-sm text-primary underline">
        {t('forgot')}
      </Link>
    </form>
  );
}
