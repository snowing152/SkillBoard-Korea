import type { ReactNode } from 'react';
import { BottomNav } from '@/components/shell/main-nav';
import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';

/**
 * Header, page, footer and (phones only) the bottom navigation. Used by the `(main)` layout and by
 * `not-found`/`error`, which render outside it. The bottom padding keeps the footer above the fixed
 * bottom bar. The public profile does not use it: its header lives in the media cover.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom))] sm:pb-0">
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
