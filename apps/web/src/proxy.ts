import type { AuthSession } from '@skillboard/shared';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { PATH_HEADER, stripLocalePrefix } from './lib/path';
import { refreshSession } from './lib/refresh-session';
import { cookieOptions, REFRESH_COOKIE, secondsUntil, SESSION_COOKIE } from './lib/session-cookies';

const handleI18nRouting = createMiddleware(routing);

/** The Google callback sets the session itself; refreshing here would race it (ADR 0020). */
const SKIP_REFRESH_PREFIX = '/auth/callback';

/** `none` covers "nothing to do" and "API unreachable": in both cases the cookies stay as they are. */
type Renewal = { kind: 'renewed'; session: AuthSession } | { kind: 'rejected' } | { kind: 'none' };

async function maybeRenew(request: NextRequest, path: string): Promise<Renewal> {
  if (path.startsWith(SKIP_REFRESH_PREFIX)) return { kind: 'none' };
  if (request.cookies.has(SESSION_COOKIE)) return { kind: 'none' };
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return { kind: 'none' };

  const result = await refreshSession(refreshToken);
  if (result.ok) return { kind: 'renewed', session: result.session };
  return result.reason === 'REJECTED' ? { kind: 'rejected' } : { kind: 'none' };
}

// Next 16 calls this file proxy.ts (formerly middleware.ts). It does three things, in this order:
// 1. exposes the requested path to Server Components (a layout cannot read the URL, but the consent
//    redirect needs it for `/consent?next=<current path>`);
// 2. renews an expired access token from the refresh cookie (ADR 0020), so the very render that follows
//    already sees a valid session;
// 3. hands over to the next-intl middleware for locale routing.
export async function proxy(request: NextRequest) {
  // Always overwrite: a client-sent header must never be trusted as the path.
  request.headers.set(PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const renewal = await maybeRenew(request, stripLocalePrefix(request.nextUrl.pathname));
  if (renewal.kind === 'renewed') {
    // Written into the request first so the Server Components of this same render read the new token.
    request.cookies.set(SESSION_COOKIE, renewal.session.accessToken);
    request.cookies.set(REFRESH_COOKIE, renewal.session.refreshToken);
  } else if (renewal.kind === 'rejected') {
    request.cookies.delete(REFRESH_COOKIE);
  }

  const response = handleI18nRouting(request);

  if (renewal.kind === 'renewed') {
    const { session } = renewal;
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
  } else if (renewal.kind === 'rejected') {
    response.cookies.delete(REFRESH_COOKIE);
  }
  return response;
}

export const config = {
  // Skip API-ish paths, Next internals, and files with an extension (manifest, sw.js, icons).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
