import { randomBytes } from 'node:crypto';
import { GoogleStartQuerySchema } from '@skillboard/shared';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cookieOptions, GOOGLE_NONCE_COOKIE } from '@/lib/session-cookies';

type Params = { params: Promise<{ locale: string }> };

const NONCE_MAX_AGE_SECONDS = 600;

/**
 * Start of "Continue with Google". Instead of linking the browser straight to the API, the web app first
 * puts a random nonce into its own httpOnly cookie and sends the same value along; the API echoes it in
 * the final redirect and `/auth/callback` refuses a `code` or `signup` token whose nonce is not the one in
 * this browser's cookie. A callback link built in the attacker's browser therefore means nothing in the
 * victim's (login CSRF, ADR 0024).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { locale: rawLocale } = await params;
  const locale = routing.locales.find((l) => l === rawLocale) ?? routing.defaultLocale;

  const query = GoogleStartQuerySchema.safeParse({
    locale,
    ...Object.fromEntries(request.nextUrl.searchParams),
  });
  if (!query.success || env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'true') {
    const back = getPathname({ href: '/sign-in?error=OAUTH_FAILED', locale });
    return NextResponse.redirect(new URL(back, request.nextUrl.origin));
  }

  const webNonce = randomBytes(16).toString('base64url');
  const target = new URL('/v1/auth/google', env.NEXT_PUBLIC_API_URL);
  for (const [key, value] of Object.entries({ ...query.data, locale, webNonce })) {
    if (typeof value === 'string') target.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(target);
  response.cookies.set(GOOGLE_NONCE_COOKIE, webNonce, cookieOptions(NONCE_MAX_AGE_SECONDS));
  return response;
}
