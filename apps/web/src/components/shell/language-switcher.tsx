'use client';

import { Menu } from '@base-ui/react/menu';
import { LOCALES } from '@skillboard/shared';
import { CheckIcon, LanguagesIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Compact language menu: a 44 px button showing the current locale code, opening the three
 * language names (each in its own script). Keeps the current page; the query string is dropped.
 * `tone="onMedia"` is the white hairline version for the profile cover.
 */
export function LanguageSwitcher({ tone = 'default' }: { tone?: 'default' | 'onMedia' }) {
  const t = useTranslations('common.language');
  const current = useLocale();
  const pathname = usePathname();

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t('change', { current: t(current) })}
        className={cn(
          buttonVariants({ variant: tone === 'onMedia' ? 'onMedia' : 'outline', size: 'sm' }),
          'min-w-11 gap-1.5 uppercase',
        )}
      >
        <LanguagesIcon aria-hidden="true" />
        {current}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className="min-w-44 rounded-control bg-popover p-1 text-popover-foreground shadow-popover outline-none">
            {LOCALES.map((locale) => (
              <Menu.LinkItem
                key={locale}
                render={<Link href={pathname} locale={locale} />}
                aria-current={locale === current ? 'true' : undefined}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-body-sm text-foreground no-underline outline-none data-highlighted:bg-muted"
              >
                <span lang={locale}>{t(locale)}</span>
                {locale === current && (
                  <CheckIcon aria-hidden="true" className="size-4 text-primary" />
                )}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
