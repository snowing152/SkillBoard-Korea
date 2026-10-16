'use client';

import type { SignupRole } from '@skillboard/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { completeGoogleSignUp } from '@/actions/google';
import { FieldMessage } from '@/components/auth/auth-fields';
import { RoleCards } from '@/components/auth/role-cards';
import { TermsLink } from '@/components/auth/terms-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useRouter } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';
import { defaultLandingPath } from '@/lib/auth-forms';

/**
 * The step between Google and a new account: choose a role and accept the terms. Nothing exists until
 * the button is pressed; the token that names the Google identity sits in an httpOnly cookie.
 */
export function GoogleSignUpForm({
  next,
  initialRole,
}: {
  next?: string | undefined;
  initialRole: SignupRole;
}) {
  const t = useTranslations('auth.googleSignUp');
  const tSignUp = useTranslations('auth.signUp');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>(initialRole);
  const [accepted, setAccepted] = useState(false);
  const [showAcceptError, setShowAcceptError] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (!accepted) {
      setShowAcceptError(true);
      return;
    }
    setFailure(null);
    startTransition(async () => {
      const result = await completeGoogleSignUp({ role, acceptTerms: accepted }, locale);
      if (!result.ok) {
        setFailure(result);
        return;
      }
      router.push(next ?? defaultLandingPath(result.data.roles), { locale: result.data.locale });
    });
  };

  const expired = failure?.code === 'NOT_FOUND';
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <RoleCards value={role} onChange={setRole} />
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 items-start gap-3 text-body-sm">
          <Checkbox
            checked={accepted}
            onCheckedChange={(value) => {
              setAccepted(value);
              if (value) setShowAcceptError(false);
            }}
            aria-invalid={showAcceptError ? true : undefined}
            className="mt-0.5"
          />
          <span>
            {tSignUp.rich('acceptTerms', {
              terms: (chunks) => <TermsLink href="/legal/terms">{chunks}</TermsLink>,
              privacy: (chunks) => <TermsLink href="/legal/privacy">{chunks}</TermsLink>,
            })}
          </span>
        </label>
        <FieldMessage error={showAcceptError ? tSignUp('acceptRequired') : undefined} />
      </div>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>
            {expired
              ? t('expired')
              : failure.code === 'CONFLICT'
                ? t('exists')
                : tCommon(errorMessageKey(failure.code))}
          </AlertDescription>
        </Alert>
      )}
      {failure && (expired || failure.code === 'CONFLICT') ? (
        <Link href="/sign-in" className={buttonVariants({ size: 'lg' })}>
          {t('backToSignIn')}
        </Link>
      ) : (
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {t('submit')}
        </Button>
      )}
    </form>
  );
}
