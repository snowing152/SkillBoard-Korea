import { APP_NAME } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const LINK_CLASS =
  'flex min-h-11 items-center text-foreground-secondary no-underline hover:text-foreground hover:underline';

/** On every page (legal spec): the three legal links, stacked on a phone, one row on desktop. */
export function SiteFooter() {
  const t = useTranslations('legal.footer');
  return (
    <footer className="border-t text-body-sm">
      <div className="mx-auto flex w-full max-w-shell flex-col gap-2 px-gutter py-6 sm:flex-row sm:items-center sm:justify-between">
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
        <p className="text-caption text-muted-foreground">{APP_NAME}</p>
      </div>
    </footer>
  );
}
