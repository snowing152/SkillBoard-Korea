import { ChevronLeftIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { Logo } from '@/components/shell/logo';
import { Link } from '@/i18n/navigation';

/**
 * Header row inside the public profile's cover on phones: back to the list, wordmark, language.
 * Hidden from `sm`, where the regular site header sits above the profile column.
 */
export function ProfileCoverHeader() {
  const t = useTranslations('common.nav');
  return (
    <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center px-gutter sm:hidden">
      <Link
        href="/talents"
        aria-label={t('back')}
        className="-ml-2.5 flex size-11 items-center justify-center text-media-foreground"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5.5" strokeWidth={1.75} />
      </Link>
      <Logo />
      <div className="justify-self-end">
        <LanguageSwitcher tone="onMedia" />
      </div>
    </div>
  );
}
