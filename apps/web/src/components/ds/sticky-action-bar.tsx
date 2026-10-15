import type { ReactNode } from 'react';

/**
 * Bottom bar for the page's one main action, within thumb reach. `sticky`, not `fixed`: put it last
 * in the page so it rides the bottom edge while scrolling and never covers the footer or needs a
 * spacer. The inner column matches the page column on desktop. Respects the iPhone home indicator.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 border-t bg-card px-gutter pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-content flex-col gap-2">{children}</div>
    </div>
  );
}
