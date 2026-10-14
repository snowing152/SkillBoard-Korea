'use server';

import { type LegalDocument, type Login, LoginSchema } from '@skillboard/shared';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { type ActionResult, toActionFailure } from '@/lib/api-errors';
import { clearSession, setSession } from '@/lib/session';

/**
 * Server Actions are the only way the browser talks to the API (ADR 0019): the form posts here, this
 * code calls the API with the server-side client and stores the token in an httpOnly cookie.
 * Keep them thin: validate, call one endpoint, map the error code, return a result. No business rules.
 */
export async function signIn(
  input: Login,
): Promise<ActionResult<{ pendingConsents: LegalDocument[] }>> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };

  let session;
  try {
    const { data, error } = await api.POST('/v1/auth/login', { body: parsed.data });
    if (!data) return toActionFailure(error);
    session = data;
  } catch (err: unknown) {
    return toActionFailure(err); // network failure: the API is down or waking up (ADR 0013)
  }
  await setSession(session.accessToken, session.expiresInSeconds);
  // The Client Component navigates on success (next-intl's redirect() is not typed `never` in actions):
  // to /consent when a document version is still to be accepted, otherwise to the page it wanted.
  return { ok: true, data: { pendingConsents: session.user.pendingConsents } };
}

export async function signOut(): Promise<void> {
  await clearSession();
  redirect({ href: '/', locale: await getLocale() });
}
