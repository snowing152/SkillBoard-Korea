import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Two-column grid of key facts (`<dl>`). Two columns even at 375 px: each tile is ~165 px wide, so
 * values wrap onto several lines instead of being cut off. Never shorten a fact (visa, languages).
 */
export function FactGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid grid-cols-2 gap-2', className)}>{children}</dl>;
}

/** One fact: muted label over a medium-weight value. Long words (Russian) break and hyphenate. */
export function FactTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-control bg-card px-3 py-2.5 text-label">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium wrap-break-word hyphens-auto text-foreground">{children}</dd>
    </div>
  );
}
