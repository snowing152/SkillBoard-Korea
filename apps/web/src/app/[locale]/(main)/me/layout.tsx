import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { redirect } from '@/i18n/navigation';
import { apiAsUser } from '@/lib/api';
import { PATH_HEADER, stripLocalePrefix } from '@/lib/path';
import { safeNextPath } from '@/lib/safe-path';

/**
 * Everything under /me needs a user who accepted the current document versions (legal spec). The API
 * does not block (mobile renders its own screen), so the web enforces it here, once, for every page.
 * `accounts` extends this layout; keep the consent check first.
 */
export default async function MeLayout({ children }: { children: ReactNode }) {
  const client = await apiAsUser();
  // No session: each page sends the visitor to sign-in itself, with its own states.
  if (client) {
    const { data } = await client.GET('/v1/me/consents');
    if (data && data.pending.length > 0) {
      const raw = (await headers()).get(PATH_HEADER) ?? undefined;
      const next = safeNextPath(raw ? stripLocalePrefix(raw) : undefined, '/me/talent-profile');
      redirect({ href: `/consent?next=${encodeURIComponent(next)}`, locale: await getLocale() });
    }
  }
  return children;
}
