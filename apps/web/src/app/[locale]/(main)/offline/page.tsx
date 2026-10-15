import { WifiOffIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/ds/page';
import { EmptyState } from '@/components/ds/states';

// Served by public/sw.js when a navigation fails offline.
export default function OfflinePage() {
  const t = useTranslations('common.offline');
  return (
    <PageContainer>
      <EmptyState as="h1" icon={<WifiOffIcon />} title={t('title')} body={t('body')} />
    </PageContainer>
  );
}
