import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const WIDTHS = { content: 'max-w-content', form: 'max-w-form', prose: 'max-w-prose' } as const;

/**
 * The `<main>` of every page: centered column, 16 px gutters, 24 px between blocks. Pick the width
 * by content: `form` for forms, `prose` for long text, `content` for everything else.
 */
export function PageContainer({
  children,
  width = 'content',
  className,
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-col gap-6 px-gutter pt-6 pb-10 sm:pt-10',
        WIDTHS[width],
        className,
      )}
    >
      {children}
    </main>
  );
}

/** Page title (`<h1>`) with an optional lead paragraph and a slot for badges or actions. */
export function PageHeader({
  title,
  description,
  children,
  titleClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** For a visually hidden title (`sr-only`) when the page shows its name elsewhere. */
  titleClassName?: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className={cn('text-title font-semibold sm:text-display', titleClassName)}>{title}</h1>
      {description && <p className="text-body text-foreground-secondary">{description}</p>}
      {children}
    </header>
  );
}

/** White card section with an optional heading; the default container for grouped content. */
export function Section({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-stack rounded-card bg-card p-4 sm:p-5', className)}>
      {title && <h2 className="text-title-sm font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
