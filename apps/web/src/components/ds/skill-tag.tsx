import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A list of skill tags that wraps onto as many lines as it needs. `label` names the list. */
export function SkillTagList({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {children}
    </ul>
  );
}

/** One skill: teal tint, 6 px radius. Text wraps inside the tag rather than overflowing the row. */
export function SkillTag({ children }: { children: ReactNode }) {
  return (
    <li className="max-w-full rounded-tag bg-tag px-2.5 py-1 text-caption font-medium wrap-break-word text-tag-foreground">
      {children}
    </li>
  );
}
