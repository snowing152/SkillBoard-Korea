import { AuthSessionSchema, SIGNUP_ROLES } from '@skillboard/shared';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { oauthErrorKey } from '@/lib/oauth-error';
import { defaultLandingPath } from '@/lib/auth-forms';
import { safeNextPath } from '@/lib/safe-path';
import {
  cookieOptions,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_LINK_COOKIE,
  GOOGLE_SIGNUP_COOKIE,
  GOOGLE_SIGNUP_MAX_AGE_SECONDS,
  REFRESH_COOKIE,
  secondsUntil,
  SESSION_COOKIE,
} from '@/lib/session-cookies';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string }> };

const EXCHANGE_TIMEOUT_MS = 5000;

/**
 * Where the API's Google callback sends the browser (`/<locale>/auth/callback?code=…&next=…`, or
 * `signup=…` / `link=…` for the steps a person confirms by POST). The
 * single-use code is exchanged for a session here, on the server, so no token ever appears in a URL
 * or in browser JavaScript. Failure of any kind lands on `/sign-in?error=<CODE>` (ADR 0020).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { locale: rawLocale } = await params;
  const locale = routing.locales.find((l) => l === rawLocale) ?? routing.defaultLocale;
  const go = (href: string, to = locale) =>
    NextResponse.redirect(new URL(getPathname({ href, locale: to }), request.nextUrl.origin));

  const search = request.nextUrl.searchParams;
  const error = search.get('error');
  const code = search.get('code');
  const signup = search.get('signup');
  const link = search.get('link');

  // A `code` or `signup` token is only honoured in the browser that started the flow here: the nonce in
  // the URL must equal the one in this browser's cookie (login CSRF, ADR 0024). The cookie is one-shot.
  const nonceCookie = request.cookies.get(GOOGLE_NONCE_COOKIE)?.value;
  const nonceMatches = nonceCookie !== undefined && nonceCookie === search.get('n');
  const failed = () => {
    const response = go('/sign-in?error=OAUTH_FAILED');
    response.cookies.delete(GOOGLE_NONCE_COOKIE);
    return response;
  };
  if ((code !== null || signup !== null || link !== null) && !nonceMatches) return failed();

  // A Google user whose email belongs to an existing account: nothing is linked yet. Linking removes the
  // password and signs every session out, so the owner confirms it by POST on the next page (ADR 0025).
  if (error === null && code === null && link !== null && /^[A-Za-z0-9_-]{43}$/.test(link)) {
    const safe = safeNextPath(search.get('next') ?? undefined, '');
    const response = go(
      safe ? `/sign-in/google/link?next=${encodeURIComponent(safe)}` : '/sign-in/google/link',
    );
    response.cookies.delete(GOOGLE_NONCE_COOKIE);
    response.cookies.set(GOOGLE_LINK_COOKIE, link, cookieOptions(GOOGLE_SIGNUP_MAX_AGE_SECONDS));
    return response;
  }

  // A Google user without an account: the API created nothing and handed over a signed token. It goes
  // into an httpOnly cookie (never into browser JavaScript or the page URL) for the role-choice step.
  if (error === null && code === null && signup !== null && /^[A-Za-z0-9_-]{43}$/.test(signup)) {
    const query = new URLSearchParams();
    const safe = safeNextPath(search.get('next') ?? undefined, '');
    if (safe) query.set('next', safe);
    // Only a preselection on the role step; the consent is given there.
    const role = SIGNUP_ROLES.find((r) => r === search.get('role'));
    if (role) query.set('role', role);
    const rest = query.toString();
    const response = go(`/sign-up/google${rest ? `?${rest}` : ''}`);
    response.cookies.delete(GOOGLE_NONCE_COOKIE);
    response.cookies.set(
      GOOGLE_SIGNUP_COOKIE,
      signup,
      cookieOptions(GOOGLE_SIGNUP_MAX_AGE_SECONDS),
    );
    return response;
  }

  if (error !== null || code === null) {
    const response = go(`/sign-in?error=${oauthErrorKey(error ?? 'OAUTH_FAILED')}`);
    response.cookies.delete(GOOGLE_NONCE_COOKIE);
    return response;
  }

  let session;
  try {
    const res = await fetch(`${env.API_URL}/v1/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      // A cold or stuck API must not hold the browser's request open (same deadline as the refresh).
      signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
      cache: 'no-store',
    });
    const parsed = res.ok ? AuthSessionSchema.safeParse(await res.json()) : null;
    if (!parsed?.success) return go('/sign-in?error=OAUTH_FAILED');
    session = parsed.data;
  } catch {
    return go('/sign-in?error=OAUTH_FAILED');
  }

  const response = go(
    sessionTarget(session.user.pendingConsents.length, search.get('next'), session.user.roles),
    session.user.locale,
  );
  response.cookies.delete(GOOGLE_NONCE_COOKIE);
  // Set on the redirect itself (not through `cookies()`), so the response that sends the browser on
  // is the one that carries the session.
  response.cookies.set(
    SESSION_COOKIE,
    session.accessToken,
    cookieOptions(session.expiresInSeconds),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    session.refreshToken,
    cookieOptions(secondsUntil(session.refreshExpiresAt)),
  );
  return response;
}

function sessionTarget(pending: number, rawNext: string | null, roles: readonly string[]): string {
  const target = safeNextPath(rawNext ?? undefined, defaultLandingPath(roles));
  return pending > 0 ? `/consent?next=${encodeURIComponent(target)}` : target;
}
