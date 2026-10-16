'use server';

import { type AuthSession, type Locale, LocaleSchema, SIGNUP_ROLES } from '@skillboard/shared';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { api } from '@/lib/api';
import { type ActionResult, toActionFailure } from '@/lib/api-errors';
import { GOOGLE_SIGNUP_COOKIE } from '@/lib/session-cookies';
import { setSession } from '@/lib/session';
import type { SessionOutcome } from '@/actions/auth';

const ChoiceSchema = z.object({
  role: z.enum(SIGNUP_ROLES),
  acceptTerms: z.literal(true),
});

/**
 * Second half of "Continue with Google" for a person without an account: the role and the consent they
 * just gave, plus the signed token the callback left in an httpOnly cookie. `locale` comes from the form
 * because `getLocale()` cannot run in a Server Action.
 */
export async function completeGoogleSignUp(
  input: { role: string; acceptTerms: boolean },
  locale: Locale,
): Promise<ActionResult<SessionOutcome>> {
  const choice = ChoiceSchema.safeParse(input);
  const lang = LocaleSchema.safeParse(locale);
  if (!choice.success || !lang.success) return { ok: false, code: 'VALIDATION_FAILED' };

  const store = await cookies();
  const signupToken = store.get(GOOGLE_SIGNUP_COOKIE)?.value;
  if (!signupToken) return { ok: false, code: 'NOT_FOUND' };

  let session: AuthSession;
  try {
    const { data, error } = await api.POST('/v1/auth/google/complete', {
      body: { signupToken, ...choice.data, locale: lang.data },
    });
    if (!data) return toActionFailure(error);
    session = data;
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  await setSession(session);
  store.delete(GOOGLE_SIGNUP_COOKIE);
  return {
    ok: true,
    data: {
      pendingConsents: session.user.pendingConsents,
      roles: session.user.roles,
      locale: session.user.locale,
    },
  };
}
