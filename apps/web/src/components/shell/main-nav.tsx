'use client';

import { HouseIcon, SearchIcon, SettingsIcon, UserRoundIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { isActivePath } from '@/lib/nav';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', key: 'home', icon: HouseIcon },
  { href: '/talents', key: 'talents', icon: SearchIcon },
  { href: '/me/talent-profile', key: 'profile', icon: UserRoundIcon },
  { href: '/me/account', key: 'account', icon: SettingsIcon },
] as const;

/** Desktop navigation in the header (from `sm`). Text links; the active one is marked. */
export function HeaderNav() {
  const t = useTranslations('common.nav');
  const pathname = usePathname();
  const labels = { talents: t('talents'), profile: t('myProfile'), account: t('myAccount') };

  return (
    <nav aria-label={t('label')} className="hidden items-center gap-1 sm:flex">
      {ITEMS.filter((item) => item.key !== 'home').map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center rounded-control px-3 text-body-sm font-medium no-underline hover:bg-muted',
              active ? 'text-primary' : 'text-foreground-secondary',
            )}
          >
            {labels[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Phone navigation fixed to the bottom edge (thumb reach), hidden from `sm`. Four items, icon over a
 * short label; labels may wrap to two lines in Russian, the bar grows instead of clipping.
 */
export function BottomNav() {
  const t = useTranslations('common.bottomNav');
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('label')}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-bottom-nav flex-col items-center justify-center gap-1 px-1 py-2 text-center text-caption leading-tight no-underline',
                  active ? 'font-semibold text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-5.5" strokeWidth={active ? 2.25 : 1.75} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
