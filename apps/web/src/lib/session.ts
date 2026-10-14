import { APP_SLUG } from '@skillboard/shared';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';

/**
 * Web session (ADR 0019): the API access token lives in an httpOnly cookie that only Next.js server
 * code can read. Client Components never see it; they call Server Actions (`src/actions/`), which read
 * the cookie here and talk to the API with `apiAsUser()` from `@/lib/api`.
 * Only Server Actions and Route Handlers may call `setSession` / `clearSession` (Next.js rule).
 */
export const SESSION_COOKIE = `${APP_SLUG}_session`;

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSession(accessToken: string, expiresInSeconds: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: expiresInSeconds,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
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
