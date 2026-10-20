import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { VerifyEmailBanner } from '@/components/auth/verify-email-banner';
import { redirect } from '@/i18n/navigation';
import { apiAsUser } from '@/lib/api';
import { PATH_HEADER, stripLocalePrefix } from '@/lib/path';
import { safeNextPath } from '@/lib/safe-path';

const PROFILE_PATH = '/me/talent-profile';

/**
 * Everything under /me needs a user who accepted the current document versions (legal spec) and shows
 * the "verify your email" banner while the address is unverified (accounts spec). The API does not block
 * (mobile renders its own screens), so the web enforces both here, once, for every page.
 * The consent check comes first: an unverified user with a pending document is sent to /consent.
 */
export default async function MeLayout({ children }: { children: ReactNode }) {
  const client = await apiAsUser();
  // No session: each page sends the visitor to sign-in itself, with its own states.
  if (!client) return children;

  const { data: me } = await client.GET('/v1/me');
  if (!me) return children;

  const raw = (await headers()).get(PATH_HEADER) ?? undefined;
  const path = raw ? stripLocalePrefix(raw) : undefined;

  if (me.pendingConsents.length > 0) {
    const next = safeNextPath(path, PROFILE_PATH);
    redirect({ href: `/consent?next=${encodeURIComponent(next)}`, locale: await getLocale() });
  }
  if (me.emailVerified) return children;

  // "Go live" wording only where it is true: the profile page, with a profile that is published.
  let variant: 'default' | 'goLive' = 'default';
  if (path === PROFILE_PATH || path?.startsWith(`${PROFILE_PATH}?`)) {
    const { data: profile } = await client.GET('/v1/me/talent-profile');
    if (profile?.status === 'PUBLISHED') variant = 'goLive';
  }

  return (
    <>
      <VerifyEmailBanner variant={variant} />
      {children}
    </>
  );
}
