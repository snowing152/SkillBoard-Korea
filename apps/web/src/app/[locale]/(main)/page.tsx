import { BriefcaseIcon, SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageContainer, PageHeader, Section } from '@/components/ds/page';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Placeholder home page (Phase B). Real content comes with its spec; the layout uses the design system.
export default function HomePage() {
  const t = useTranslations('home');
  const tNav = useTranslations('common.nav');

  return (
    <PageContainer>
      <PageHeader title={t('title')} description={t('tagline')} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/talents" className={buttonVariants({ size: 'lg' })}>
          {tNav('talents')}
        </Link>
        <Link
          href="/me/talent-profile"
          className={buttonVariants({ variant: 'outline', size: 'lg' })}
        >
          {tNav('myProfile')}
        </Link>
      </div>
      <div className="grid gap-stack sm:grid-cols-2">
        <Section title={t('forTalent.title')}>
          <BriefcaseIcon aria-hidden="true" className="size-6 text-primary" />
          <p className="text-body-sm text-foreground-secondary">{t('forTalent.body')}</p>
        </Section>
        <Section title={t('forClients.title')}>
          <SearchIcon aria-hidden="true" className="size-6 text-primary" />
          <p className="text-body-sm text-foreground-secondary">{t('forClients.body')}</p>
        </Section>
      </div>
      <p className="text-label text-muted-foreground">{t('comingSoon')}</p>
      <Link href="/sign-in" className={buttonVariants({ variant: 'link' })}>
        {tNav('signIn')}
      </Link>
    </PageContainer>
  );
}
