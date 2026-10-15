import type { ConsentList as ConsentListData } from '@skillboard/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { Section } from '@/components/ds/page';

/** The user's consent history, newest first. Dates go through next-intl (Asia/Seoul, ADR 0017). */
export function ConsentList({ items }: { items: ConsentListData['items'] }) {
  const t = useTranslations('legal');
  const format = useFormatter();

  return (
    <Section title={t('list.title')}>
      {items.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t('list.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {items.map((item) => (
            <li
              key={`${item.type}-${item.version}`}
              className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-body-sm font-medium">{documentTitle(t, item.type)}</span>
              <span className="text-label text-muted-foreground">
                {item.version}
                {' · '}
                {t('list.locale')}: {item.locale}
                {' · '}
                {format.dateTime(new Date(item.acceptedAt), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

type Translate = ReturnType<typeof useTranslations<'legal'>>;

/** Document type → the title of its legal page (`VISA_DISCLAIMER` is `visa` in the messages). */
export function documentTitle(t: Translate, type: 'TERMS' | 'PRIVACY' | 'VISA_DISCLAIMER'): string {
  if (type === 'TERMS') return t('terms.title');
  if (type === 'PRIVACY') return t('privacy.title');
  return t('visa.title');
}
