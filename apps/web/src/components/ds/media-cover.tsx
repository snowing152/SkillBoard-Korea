import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** True when the talent has an intro video: dark media surface. False: the primary color. */
  hasMedia: boolean;
  /** Optional header row at the top (back, logo, language) on pages without the site header. */
  header?: ReactNode;
  /** Bottom-right action, e.g. the "Watch intro" pill. */
  action?: ReactNode;
  /** Bottom-left overlap, e.g. the avatar; sits half outside the cover. */
  overlap?: ReactNode;
  className?: string;
};

/**
 * The 210 px cover at the top of a profile. Text on it is `media-foreground` (white), which passes
 * AA on both the dark media color (15.8:1) and the primary fallback (6.4:1). No image, no gradient.
 */
export function MediaCover({ hasMedia, header, action, overlap, className }: Props) {
  return (
    <section
      className={cn(
        'relative h-cover shrink-0 text-media-foreground',
        hasMedia ? 'bg-media' : 'bg-primary',
        className,
      )}
    >
      {header}
      {action && <div className="absolute right-5 bottom-4.5">{action}</div>}
      {overlap && <div className="absolute bottom-0 left-5 translate-y-1/2">{overlap}</div>}
    </section>
  );
}
