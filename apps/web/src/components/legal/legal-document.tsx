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
 * One layout for every legal text: `<h1>`, the date line, then `<h2>` + `<p>` per section. Pure
 * rendering, so the privacy policy, terms and visa disclaimer cannot drift apart in structure.
 */
export function LegalDocument({ title, updatedLabel, sections, values = {} }: Props) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{updatedLabel}</p>
      </header>
      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed">
              {fillPlaceholders(paragraph, values)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
