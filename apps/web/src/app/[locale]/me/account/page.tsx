import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ConsentList } from '@/components/legal/consent-list';
import { apiAsUser } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';
import { redirectToSignIn } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.nav');
  return { title: t('myAccount') };
}

/** Minimal for now: only the consent history. `accounts` adds its sections above the list. */
export default async function MyAccountPage() {
  const t = await getTranslations('common.nav');
  const client = await apiAsUser();
  if (!client) return redirectToSignIn();

  const { data, error } = await client.GET('/v1/me/consents');
  if (!data) {
    const failure = toActionFailure(error);
    if (failure.code === 'UNAUTHENTICATED') return redirectToSignIn();
    throw new Error(`API ${failure.code} (request ${failure.requestId ?? 'unknown'})`);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">{t('myAccount')}</h1>
      <ConsentList items={data.items} />
    </main>
  );
}
