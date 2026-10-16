import type { CookieOptions, Request } from 'express';

/**
 * The nonce cookie that binds a Google flow to the browser that started it (login CSRF). It lives on the
 * API origin, is only sent to the callback path, and dies with the 10 minute state.
 */
export const OAUTH_NONCE_COOKIE = 'skillboard_oauth_nonce';
const MAX_AGE_MS = 10 * 60 * 1000;
const PATH = '/v1/auth/google';

export function oauthNonceCookieOptions(production: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: production, path: PATH, maxAge: MAX_AGE_MS };
}

/** Options for clearing: same name and path, no maxAge. */
export const OAUTH_NONCE_CLEAR_OPTIONS: CookieOptions = { path: PATH };

/** Reads one cookie from the raw header; the API has no cookie-parser and needs exactly this one. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}
