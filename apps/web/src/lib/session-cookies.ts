import { APP_SLUG } from '@skillboard/shared';

/**
 * Cookie names and options, kept free of `next/headers` so the proxy (which has its own cookie API)
 * and the Server Actions use the same values (ADR 0019, 0020).
 */
export const SESSION_COOKIE = `${APP_SLUG}_session`;
export const REFRESH_COOKIE = `${APP_SLUG}_refresh`;

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/** Seconds until an ISO timestamp, never negative; the refresh cookie lives exactly as long as the token. */
export function secondsUntil(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((Date.parse(iso) - now) / 1000));
}
