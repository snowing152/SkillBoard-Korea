import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';

const LINK_CLASS = 'flex min-h-11 items-center underline-offset-4 hover:underline';

/** On every page (legal spec): the three legal links, stacked on a phone, one row on desktop. */
export function SiteFooter() {
  const t = useTranslations('legal.footer');
  return (
    <footer className="mt-12 border-t p-4 text-sm">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label={t('label')} className="flex flex-col sm:flex-row sm:gap-6">
          <Link href="/legal/privacy" className={LINK_CLASS}>
            {t('privacy')}
          </Link>
          <Link href="/legal/terms" className={LINK_CLASS}>
            {t('terms')}
          </Link>
          <Link href="/legal/visa" className={LINK_CLASS}>
            {t('visa')}
          </Link>
        </nav>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
