import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { PATH_HEADER } from './lib/path';

const handleI18nRouting = createMiddleware(routing);

// Next 16 calls this file proxy.ts (formerly middleware.ts). It handles locale detection and exposes
// the requested path to Server Components: a layout cannot read the URL, but the consent redirect
// needs it for `/consent?next=<current path>`.
export function proxy(request: NextRequest) {
  // Always overwrite: a client-sent header must never be trusted as the path.
  request.headers.set(PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return handleI18nRouting(request);
}

export const config = {
  // Skip API-ish paths, Next internals, and files with an extension (manifest, sw.js, icons).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
