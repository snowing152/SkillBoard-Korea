/**
 * Whether a navigation item points at the current page. `pathname` is locale-free (from
 * `@/i18n/navigation`). Home matches only itself; other items also match their sub-pages, so
 * "My profile" stays active on /me/talent-profile/edit.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
