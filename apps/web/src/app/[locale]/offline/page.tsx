import { useTranslations } from 'next-intl';

// Served by public/sw.js when a navigation fails offline.
export default function OfflinePage() {
  const t = useTranslations('common.offline');
  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-muted">{t('body')}</p>
    </main>
  );
}
