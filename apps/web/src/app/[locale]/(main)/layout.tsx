import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { getAccessToken } from '@/lib/session';

/**
 * Route group `(main)` (no URL segment): every page with the standard header, footer and phone
 * bottom navigation. The public profile `/t/[slug]` sits outside because its header is in the cover.
 * The shell learns here whether someone is signed in: the proxy has already renewed an expired access
 * token, so the cookie is present exactly when the session is.
 */
export default async function MainLayout({ children }: { children: ReactNode }) {
  const signedIn = (await getAccessToken()) !== null;
  return <AppShell signedIn={signedIn}>{children}</AppShell>;
}
