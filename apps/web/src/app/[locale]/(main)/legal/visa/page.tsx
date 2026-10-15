import { LEGAL_VERSIONS, SUPPORT_EMAIL, HIKOREA_URL } from '@skillboard/shared';
import { ExternalLinkIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageContainer } from '@/components/ds/page';
import { LegalDocument, type LegalSection } from '@/components/legal/legal-document';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal');
  return { title: t('visa.title') };
}

// Static text from messages/<locale>/legal.json; the version date comes from LEGAL_VERSIONS.
export default async function VisaPage() {
  const t = await getTranslations('legal');
  return (
    <PageContainer width="prose">
      <LegalDocument
        title={t('visa.title')}
        updatedLabel={t('visa.updatedLabel', { date: new Date(LEGAL_VERSIONS.VISA_DISCLAIMER) })}
        sections={t.raw('visa.sections') as LegalSection[]}
        values={{ email: SUPPORT_EMAIL }}
      />
      <a
        href={HIKOREA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: 'outline' }), 'self-start')}
      >
        {t('disclaimer.hikorea')}
        <ExternalLinkIcon aria-hidden="true" />
      </a>
    </PageContainer>
  );
}
