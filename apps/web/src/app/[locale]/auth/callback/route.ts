import { AuthSessionSchema } from '@skillboard/shared';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { oauthErrorKey } from '@/lib/oauth-error';
import { defaultLandingPath } from '@/lib/auth-forms';
import { safeNextPath } from '@/lib/safe-path';
import {
  cookieOptions,
  GOOGLE_SIGNUP_COOKIE,
  GOOGLE_SIGNUP_MAX_AGE_SECONDS,
  REFRESH_COOKIE,
  secondsUntil,
  SESSION_COOKIE,
} from '@/lib/session-cookies';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string }> };

/**
 * Where the API's Google callback sends the browser (`/<locale>/auth/callback?code=…&next=…`). The
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

  // A Google user without an account: the API created nothing and handed over a signed token. It goes
  // into an httpOnly cookie (never into browser JavaScript or the page URL) for the role-choice step.
  if (error === null && code === null && signup !== null && signup.length <= 4000) {
    const next = search.get('next');
    const safe = safeNextPath(next ?? undefined, '');
    const response = go(
      safe ? `/sign-up/google?next=${encodeURIComponent(safe)}` : '/sign-up/google',
    );
    response.cookies.set(
      GOOGLE_SIGNUP_COOKIE,
      signup,
      cookieOptions(GOOGLE_SIGNUP_MAX_AGE_SECONDS),
    );
    return response;
  }

  if (error !== null || code === null) {
    return go(`/sign-in?error=${oauthErrorKey(error ?? 'OAUTH_FAILED')}`);
  }

  let session;
  try {
    const res = await fetch(`${env.API_URL}/v1/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
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
