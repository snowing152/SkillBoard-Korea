import { LEGAL_VERSIONS, SUPPORT_EMAIL } from '@skillboard/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageContainer } from '@/components/ds/page';
import { LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal');
  return { title: t('terms.title') };
}

// Static text from messages/<locale>/legal.json; the version date comes from LEGAL_VERSIONS.
export default async function TermsPage() {
  const t = await getTranslations('legal');
  return (
    <PageContainer width="prose">
      <LegalDocument
        title={t('terms.title')}
        updatedLabel={t('terms.updatedLabel', { date: new Date(LEGAL_VERSIONS.TERMS) })}
        sections={t.raw('terms.sections') as LegalSection[]}
        values={{ email: SUPPORT_EMAIL }}
      />
    </PageContainer>
  );
}
