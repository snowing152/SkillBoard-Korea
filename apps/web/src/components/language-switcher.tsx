import { LOCALES } from '@skillboard/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function LanguageSwitcher() {
  const t = useTranslations('common.language');
  const current = useLocale();
  return (
    <nav aria-label={t('label')} className="flex gap-3 text-sm">
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href="/"
          locale={locale}
          aria-current={locale === current ? 'true' : undefined}
          className={locale === current ? 'font-semibold underline' : 'text-muted'}
        >
          {t(locale)}
        </Link>
      ))}
    </nav>
  );
}
