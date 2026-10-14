import { LOCALES } from '@skillboard/shared';

/** Request header carrying the path (with query) being rendered; set by `src/proxy.ts`. */
export const PATH_HEADER = 'x-skillboard-path';

/**
 * `/ko/me/account` → `/me/account`. The proxy sees the prefixed URL, but next-intl's `redirect()` and
 * `router.push()` add the locale themselves, so a `?next=` value must be locale-free.
 */
export function stripLocalePrefix(path: string): string {
  for (const locale of LOCALES) {
    const prefix = `/${locale}`;
    if (path === prefix) return '/';
    if (path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) {
      const rest = path.slice(prefix.length);
      return rest.startsWith('?') ? `/${rest}` : rest;
    }
  }
  return path;
}
