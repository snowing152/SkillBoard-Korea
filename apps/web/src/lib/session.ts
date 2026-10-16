import type { AuthSession } from '@skillboard/shared';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { cookieOptions, REFRESH_COOKIE, secondsUntil, SESSION_COOKIE } from '@/lib/session-cookies';

/**
 * Web session (ADR 0019, 0020): the API access token and the refresh token live in two httpOnly
 * cookies that only Next.js server code can read. Client Components never see them; they call Server
 * Actions (`src/actions/`), which read the cookie here and talk to the API with `apiAsUser()` from
 * `@/lib/api`. `src/proxy.ts` renews an expired access token from the refresh cookie before a page
 * renders, so pages never see an expired session.
 * Only Server Actions and Route Handlers may call `setSession` / `clearSession` (Next.js rule).
 */
export { REFRESH_COOKIE, SESSION_COOKIE };

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export async function setSession(session: AuthSession): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, session.accessToken, cookieOptions(session.expiresInSeconds));
  store.set(
    REFRESH_COOKIE,
    session.refreshToken,
    cookieOptions(secondsUntil(session.refreshExpiresAt)),
  );
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * Server Components: send a signed-out (or expired) visitor to the sign-in page. Returns `never` so
 * `if (!client) return redirectToSignIn();` narrows `client` for the rest of the page.
 */
export async function redirectToSignIn(): Promise<never> {
  redirect({ href: '/sign-in', locale: await getLocale() });
  // next-intl types the shared redirect() as void although Next's redirect throws; keep TS honest.
  throw new Error('unreachable: redirect() throws');
}
