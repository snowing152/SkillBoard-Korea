import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { StickyActionBar } from '@/components/ds/sticky-action-bar';
import { VisaDisclaimer } from '@/components/legal/visa-disclaimer';
import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';
import { ProfileCoverHeader } from '@/components/talent-profile/profile-cover-header';
import { TalentProfileView } from '@/components/talent-profile/talent-profile-view';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

/** Public profile: rendered on the server for SEO; draft, hidden and unknown slugs are all 404. */
async function loadProfile(slug: string) {
  const { data, error } = await api.GET('/v1/talents/{slug}', { params: { path: { slug } } });
  if (data) return data;
  const failure = toActionFailure(error);
  if (failure.code === 'NOT_FOUND') notFound();
  throw new Error(`API ${failure.code} (request ${failure.requestId ?? 'unknown'})`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Same request as the page; Next.js memoises identical GET fetches within one render.
  const profile = await loadProfile(slug);
  return { title: profile.headline, description: profile.description.slice(0, 160) };
}

/**
 * Outside the `(main)` layout: on phones the header is inside the media cover and the sticky action
 * bar replaces the bottom navigation. On desktop the site header returns and the profile is a
 * centered 720 px column.
 */
export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  const t = await getTranslations('profile.view');

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader className="hidden sm:block" />
      <main className="mx-auto w-full max-w-content flex-1 pb-8 sm:px-gutter sm:pt-6">
        <TalentProfileView profile={profile} coverHeader={<ProfileCoverHeader />} />
      </main>
      <SiteFooter />
      <StickyActionBar>
        {/* Until the contact-reveal spec lands, contacts start with signing in. */}
        <Link href="/sign-in" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          {t('showContacts')}
        </Link>
        <VisaDisclaimer variant="bar" />
      </StickyActionBar>
    </div>
  );
}
