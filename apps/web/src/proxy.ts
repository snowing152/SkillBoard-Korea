import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next 16 calls this file proxy.ts (formerly middleware.ts). It only handles locale detection.
export const proxy = createMiddleware(routing);

export const config = {
  // Skip API-ish paths, Next internals, and files with an extension (manifest, sw.js, icons).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
