import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('common.notFound');
  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-muted">{t('body')}</p>
      <Link href="/" className="underline">
        {t('home')}
      </Link>
    </main>
  );
}
