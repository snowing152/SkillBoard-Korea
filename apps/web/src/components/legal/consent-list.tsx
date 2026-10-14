import type { ConsentList as ConsentListData } from '@skillboard/shared';
import { useFormatter, useTranslations } from 'next-intl';

/** The user's consent history, newest first. Dates go through next-intl (Asia/Seoul, ADR 0017). */
export function ConsentList({ items }: { items: ConsentListData['items'] }) {
  const t = useTranslations('legal');
  const format = useFormatter();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t('list.title')}</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t('list.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={`${item.type}-${item.version}`} className="rounded-lg border p-3">
              <span className="font-medium">{documentTitle(t, item.type)}</span>
              <span className="text-muted-foreground">
                {' · '}
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
    </section>
  );
}

type Translate = ReturnType<typeof useTranslations<'legal'>>;

/** Document type → the title of its legal page (`VISA_DISCLAIMER` is `visa` in the messages). */
export function documentTitle(t: Translate, type: 'TERMS' | 'PRIVACY' | 'VISA_DISCLAIMER'): string {
  if (type === 'TERMS') return t('terms.title');
  if (type === 'PRIVACY') return t('privacy.title');
  return t('visa.title');
}
