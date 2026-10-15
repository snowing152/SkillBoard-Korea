'use client';

import {
  HouseIcon,
  LogInIcon,
  SearchIcon,
  SettingsIcon,
  UserPlusIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { isActivePath } from '@/lib/nav';
import { cn } from '@/lib/utils';

const HOME = { href: '/', key: 'home', icon: HouseIcon } as const;
const TALENTS = { href: '/talents', key: 'talents', icon: SearchIcon } as const;

/** Signed-in (or unknown, e.g. the error page) visitors: their own pages. */
const MEMBER_ITEMS = [
  HOME,
  TALENTS,
  { href: '/me/talent-profile', key: 'profile', icon: UserRoundIcon },
  { href: '/me/account', key: 'account', icon: SettingsIcon },
] as const;

/** Signed-out visitors: browse, or sign in / sign up (accounts spec). */
const GUEST_ITEMS = [
  HOME,
  TALENTS,
  { href: '/sign-in', key: 'signIn', icon: LogInIcon },
  { href: '/sign-up', key: 'signUp', icon: UserPlusIcon },
] as const;

/**
 * `signedIn === false` is a known guest; `undefined` means the caller could not tell (error and
 * not-found pages render outside the layout that reads the session) and gets the member items.
 */
type NavProps = { signedIn?: boolean | undefined };

/** Desktop navigation in the header (from `sm`). Text links; the active one is marked. */
export function HeaderNav({ signedIn }: NavProps) {
  const t = useTranslations('common.nav');
  const pathname = usePathname();
  const labels = {
    talents: t('talents'),
    profile: t('myProfile'),
    account: t('myAccount'),
    signIn: t('signIn'),
    signUp: t('signUp'),
  };
  const items = signedIn === false ? GUEST_ITEMS : MEMBER_ITEMS;

  return (
    <nav aria-label={t('label')} className="hidden items-center gap-1 sm:flex">
      {items
        .filter((item) => item.key !== 'home')
        .map((item) => {
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
export function BottomNav({ signedIn }: NavProps) {
  const t = useTranslations('common.bottomNav');
  const pathname = usePathname();
  const items = signedIn === false ? GUEST_ITEMS : MEMBER_ITEMS;

  return (
    <nav
      aria-label={t('label')}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, key, icon: Icon }) => {
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
