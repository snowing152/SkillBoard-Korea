'use server';

import {
  type AuthSession,
  type Locale,
  LocaleSchema,
  type Login,
  LoginSchema,
  type PasswordResetConfirm,
  PasswordResetConfirmSchema,
  type PasswordResetRequest,
  PasswordResetRequestSchema,
  type Register,
  RegisterSchema,
  type TokenInput,
  TokenSchema,
  type LegalDocument,
  type UserRole,
} from '@skillboard/shared';
import { redirect } from '@/i18n/navigation';
import { api, apiAsUser } from '@/lib/api';
import { type ActionResult, toActionFailure } from '@/lib/api-errors';
import { clearSession, getRefreshToken, setSession } from '@/lib/session';

/**
 * Server Actions are the only way the browser talks to the API (ADR 0019): the form posts here, this
 * code calls the API with the server-side client and stores the tokens in httpOnly cookies.
 * Keep them thin: validate, call one endpoint, map the error code, return a result. No business rules.
 */

/** What the Client Component needs to decide where to go after a session started. */
export type SessionOutcome = {
  pendingConsents: LegalDocument[];
  roles: UserRole[];
  locale: Locale;
};

function outcomeOf(session: AuthSession): SessionOutcome {
  return {
    pendingConsents: session.user.pendingConsents,
    roles: session.user.roles,
    locale: session.user.locale,
  };
}

export async function signIn(input: Login): Promise<ActionResult<SessionOutcome>> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };

  let session: AuthSession;
  try {
    const { data, error } = await api.POST('/v1/auth/login', { body: parsed.data });
    if (!data) return toActionFailure(error);
    session = data;
  } catch (err: unknown) {
    return toActionFailure(err); // network failure: the API is down or waking up (ADR 0013)
  }
  await setSession(session);
  // The Client Component navigates on success (next-intl's redirect() is not typed `never` in actions).
  return { ok: true, data: outcomeOf(session) };
}

export async function signUp(input: Register): Promise<ActionResult<SessionOutcome>> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };

  let session: AuthSession;
  try {
    const { data, error } = await api.POST('/v1/auth/register', { body: parsed.data });
    if (!data) return toActionFailure(error);
    session = data;
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  await setSession(session);
  return { ok: true, data: outcomeOf(session) };
}

/**
 * Revokes the refresh token on the server first, so signing out really ends the session (ADR 0020).
 * `locale` comes from the button: `getLocale()` cannot be called inside a Server Action.
 */
export async function signOut(locale: Locale): Promise<void> {
  const [client, refreshToken] = [await apiAsUser(), await getRefreshToken()];
  if (client && refreshToken) {
    try {
      await client.POST('/v1/auth/logout', { body: { refreshToken, all: false } });
    } catch {
      // The API is unreachable: the cookies are cleared below either way, and the token expires.
    }
  }
  await clearSession();
  redirect({ href: '/', locale: LocaleSchema.catch('en').parse(locale) });
}

export async function requestPasswordReset(input: PasswordResetRequest): Promise<ActionResult> {
  const parsed = PasswordResetRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
  try {
    const { error, response } = await api.POST('/v1/auth/password-reset/request', {
      body: parsed.data,
    });
    if (!response.ok) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  return { ok: true, data: undefined };
}

export async function confirmPasswordReset(input: PasswordResetConfirm): Promise<ActionResult> {
  const parsed = PasswordResetConfirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
  try {
    const { error, response } = await api.POST('/v1/auth/password-reset/confirm', {
      body: parsed.data,
    });
    if (!response.ok) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  return { ok: true, data: undefined };
}

/** Called by the link in the email. A POST, so a mail scanner that only GETs the link cannot spend it. */
export async function confirmEmail(input: TokenInput): Promise<ActionResult> {
  const parsed = TokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'NOT_FOUND' };
  try {
    const { error, response } = await api.POST('/v1/auth/verify-email/confirm', {
      body: parsed.data,
    });
    if (!response.ok) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  return { ok: true, data: undefined };
}

export async function resendVerification(): Promise<ActionResult> {
  const client = await apiAsUser();
  if (!client) return { ok: false, code: 'UNAUTHENTICATED' };
  try {
    const { error, response } = await client.POST('/v1/auth/verify-email/request');
    if (!response.ok) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  return { ok: true, data: undefined };
}
