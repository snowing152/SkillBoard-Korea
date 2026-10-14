import { LEGAL_VERSIONS, SUPPORT_EMAIL, HIKOREA_URL } from '@skillboard/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal');
  return { title: t('visa.title') };
}

// Static text from messages/<locale>/legal.json; the version date comes from LEGAL_VERSIONS.
export default async function VisaPage() {
  const t = await getTranslations('legal');
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
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
        className="flex min-h-11 items-center underline"
      >
        {t('disclaimer.hikorea')}
      </a>
    </main>
  );
}
