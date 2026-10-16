'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type Register, RegisterSchema } from '@skillboard/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { type Resolver, useForm, useWatch } from 'react-hook-form';
import { signUp } from '@/actions/auth';
import { FieldMessage, TextField } from '@/components/auth/auth-fields';
import { googleStartUrl } from '@/components/auth/google-url';
import { OrDivider } from '@/components/auth/google-button';
import { RoleCards } from '@/components/auth/role-cards';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TermsLink } from '@/components/auth/terms-link';
import { Link, useRouter } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';

/**
 * What the form holds while the user types. The schema wants `acceptTerms: true`, but an unticked box
 * is `false`, so the form value is a boolean and the resolver (the shared schema) rejects `false`.
 */
type SignUpValues = Omit<Register, 'acceptTerms' | 'locale'> & { acceptTerms: boolean };

type Props = {
  /** `<API origin>`; null when Google sign-in is switched off. */
  googleBase: string | null;
};

export function SignUpForm({ googleBase }: Props) {
  const t = useTranslations('auth.signUp');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<SignUpValues, unknown, Register>({
    // Same schema the API validates; the cast only widens the flag from `true` to boolean (see above).
    resolver: zodResolver(RegisterSchema) as unknown as Resolver<SignUpValues, unknown, Register>,
    defaultValues: {
      role: 'TALENT',
      displayName: '',
      email: '',
      password: '',
      acceptTerms: false,
    },
  });
  const role = useWatch({ control, name: 'role' });
  const accepted = useWatch({ control, name: 'acceptTerms' });

  const onSubmit = handleSubmit((values) => {
    setFailure(null);
    startTransition(async () => {
      const result = await signUp({ ...values, locale });
      if (result.ok) router.push('/verify-email/sent');
      else setFailure(result);
    });
  });

  const onGoogle = async () => {
    // The box must be ticked before anything leaves the page: it is the consent for a new account.
    if (!(await trigger('acceptTerms'))) return;
    if (googleBase) window.location.assign(googleStartUrl(googleBase, { role, locale }));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <RoleCards
        value={role}
        onChange={(value) => {
          setValue('role', value);
        }}
      />

      <TextField
        id="displayName"
        label={t('displayName')}
        autoComplete="name"
        error={errors.displayName?.message}
        {...register('displayName')}
      />
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
        autoComplete="new-password"
        hint={t('passwordHint')}
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 items-start gap-3 text-body-sm">
          <Checkbox
            checked={accepted}
            onCheckedChange={(value) => {
              setValue('acceptTerms', value, { shouldValidate: true });
            }}
            aria-invalid={errors.acceptTerms ? true : undefined}
            className="mt-0.5"
          />
          <span>
            {t.rich('acceptTerms', {
              terms: (chunks) => <TermsLink href="/legal/terms">{chunks}</TermsLink>,
              privacy: (chunks) => <TermsLink href="/legal/privacy">{chunks}</TermsLink>,
            })}
          </span>
        </label>
        <FieldMessage error={errors.acceptTerms ? t('acceptRequired') : undefined} />
      </div>

      {failure && (
        <Alert variant="destructive">
          <AlertDescription>
            {failure.code === 'CONFLICT'
              ? tAuth('errors.emailTaken')
              : tCommon(errorMessageKey(failure.code))}
          </AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {t('submit')}
      </Button>

      {googleBase && (
        <>
          <OrDivider />
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={onGoogle}>
            {tAuth('google.continue')}
          </Button>
        </>
      )}

      <p className="text-center text-body-sm text-foreground-secondary">
        {t('haveAccount')}{' '}
        <Link href="/sign-in" className="font-medium text-primary underline">
          {t('signInLink')}
        </Link>
      </p>
    </form>
  );
}
