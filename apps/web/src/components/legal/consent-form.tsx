'use client';

import { LEGAL_VERSIONS, type LegalDocument } from '@skillboard/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { acceptConsents } from '@/actions/consent';
import { documentTitle } from '@/components/legal/consent-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useRouter } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';

const DOCUMENT_PATHS = {
  TERMS: '/legal/terms',
  PRIVACY: '/legal/privacy',
  VISA_DISCLAIMER: '/legal/visa',
} as const satisfies Record<LegalDocument, string>;

type Props = {
  pending: LegalDocument[];
  /** Already checked by `safeNextPath` on the server. */
  next: string;
};

/**
 * One checkbox per pending document, each with a link to its text and its version date. The submit
 * button stays disabled until all are ticked; the API receives only the document ids and the language.
 */
export function ConsentForm({ pending, next }: Props) {
  const t = useTranslations('legal');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [checked, setChecked] = useState<ReadonlySet<LegalDocument>>(new Set());
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [submitting, startTransition] = useTransition();
  const allChecked = pending.every((doc) => checked.has(doc));

  const toggle = (doc: LegalDocument, value: boolean) => {
    const copy = new Set(checked);
    if (value) copy.add(doc);
    else copy.delete(doc);
    setChecked(copy);
  };

  const onSubmit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (!allChecked) return;
    setFailure(null);
    startTransition(async () => {
      const result = await acceptConsents({ documents: pending, locale });
      if (result.ok) router.push(next);
      else setFailure(result);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {pending.map((doc) => (
          <li key={doc} className="flex flex-col gap-1 rounded-card bg-card p-4">
            <label className="flex min-h-11 items-start gap-3 text-body">
              <Checkbox
                checked={checked.has(doc)}
                onCheckedChange={(value) => {
                  toggle(doc, value);
                }}
                className="mt-0.5"
              />
              <span>
                {t.rich('consent.accept', {
                  name: documentTitle(t, doc),
                  doc: (chunks) => (
                    <Link
                      href={DOCUMENT_PATHS[doc]}
                      target="_blank"
                      className="font-medium text-primary underline hover:text-primary-hover"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>
            <span className="pl-8 text-label text-muted-foreground">
              {t('consent.version', { date: new Date(LEGAL_VERSIONS[doc]) })}
            </span>
          </li>
        ))}
      </ul>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{tCommon(errorMessageKey(failure.code))}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={!allChecked || submitting} size="lg" className="w-full">
        {t('consent.submit')}
      </Button>
    </form>
  );
}
