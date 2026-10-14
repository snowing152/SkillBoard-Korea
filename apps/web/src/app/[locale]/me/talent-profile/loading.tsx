import { useTranslations } from 'next-intl';

export default function Loading() {
  const t = useTranslations('common');
  return (
    <main className="mx-auto max-w-2xl p-4">
      <p role="status" className="text-muted-foreground">
        {t('loading')}
      </p>
    </main>
  );
}
