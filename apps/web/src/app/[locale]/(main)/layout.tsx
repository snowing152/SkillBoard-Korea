import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';

/**
 * Route group `(main)` (no URL segment): every page with the standard header, footer and phone
 * bottom navigation. The public profile `/t/[slug]` sits outside because its header is in the cover.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
