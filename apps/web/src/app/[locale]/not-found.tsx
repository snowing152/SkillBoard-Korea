import { SearchXIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/ds/page';
import { EmptyState } from '@/components/ds/states';
import { AppShell } from '@/components/shell/app-shell';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Rendered outside the (main) layout (it also catches 404s from /t/[slug]), so it brings the shell.
export default function NotFound() {
  const t = useTranslations('common.notFound');
  return (
    <AppShell>
      <PageContainer>
        <EmptyState
          as="h1"
          icon={<SearchXIcon />}
          title={t('title')}
          body={t('body')}
          action={
            <Link href="/" className={buttonVariants()}>
              {t('home')}
            </Link>
          }
        />
      </PageContainer>
    </AppShell>
  );
}
