import { PageHeader } from '@/components/ds/page';

export type LegalSection = { heading: string; paragraphs: string[] };

type Props = {
  title: string;
  /** Already formatted, e.g. "Last updated October 14, 2026". */
  updatedLabel: string;
  sections: LegalSection[];
  /** Replaces `{name}` placeholders in paragraphs (`{email}`); raw JSON text is not ICU-formatted. */
  values?: Record<string, string>;
};

/** Fills `{key}` placeholders in a raw message. Unknown placeholders stay visible, never silently blank. */
export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * One layout for every legal text: `<h1>`, the date line, then `<h2>` + `<p>` per section on one white
 * card. Pure rendering, so the privacy policy, terms and visa disclaimer cannot drift apart.
 */
export function LegalDocument({ title, updatedLabel, sections, values = {} }: Props) {
  return (
    <article className="flex flex-col gap-6">
      <PageHeader title={title}>
        <p className="text-body-sm text-muted-foreground">{updatedLabel}</p>
      </PageHeader>
      <div className="flex flex-col gap-6 rounded-card bg-card p-4 sm:p-6">
        {sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="text-title-sm font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-body text-foreground-secondary">
                {fillPlaceholders(paragraph, values)}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
