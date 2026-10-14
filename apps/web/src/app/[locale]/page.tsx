import { APP_NAME } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';

// Placeholder home page (Phase B). Real content and design come with the specs and Opus.
export default function HomePage() {
  const t = useTranslations('home');

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold">{APP_NAME}</span>
        <LanguageSwitcher />
      </header>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-muted">{t('tagline')}</p>
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded border p-4">
          <h2 className="font-semibold">{t('forTalent.title')}</h2>
          <p className="text-sm">{t('forTalent.body')}</p>
        </article>
        <article className="rounded border p-4">
          <h2 className="font-semibold">{t('forClients.title')}</h2>
          <p className="text-sm">{t('forClients.body')}</p>
        </article>
      </section>
      <p className="text-xs text-muted">{t('comingSoon')}</p>
    </main>
  );
}
