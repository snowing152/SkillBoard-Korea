import { LEGAL_VERSIONS, SUPPORT_EMAIL } from '@skillboard/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal');
  return { title: t('privacy.title') };
}

// Static text from messages/<locale>/legal.json; the version date comes from LEGAL_VERSIONS.
export default async function PrivacyPage() {
  const t = await getTranslations('legal');
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <LegalDocument
        title={t('privacy.title')}
        updatedLabel={t('privacy.updatedLabel', { date: new Date(LEGAL_VERSIONS.PRIVACY) })}
        sections={t.raw('privacy.sections') as LegalSection[]}
        values={{ email: SUPPORT_EMAIL }}
      />
    </main>
  );
}
