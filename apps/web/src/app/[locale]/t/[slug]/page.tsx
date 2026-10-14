import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TalentProfileView } from '@/components/talent-profile/talent-profile-view';
import { api } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';

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

export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  return (
    <main className="mx-auto max-w-2xl p-4">
      <TalentProfileView profile={profile} />
    </main>
  );
}
