import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { ProfileStatusActions } from '@/components/talent-profile/profile-status-actions';
import { TalentProfileView } from '@/components/talent-profile/talent-profile-view';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { apiAsUser } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { redirectToSignIn } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile.my');
  return { title: t('title') };
}

/**
 * Owner's page: Server Component, reads the session cookie, fetches with the user's token.
 * States: no session → sign-in; NOT_FOUND → empty state; hidden/draft/published → banner + actions.
 */
export default async function MyTalentProfilePage() {
  const t = await getTranslations('profile.my');
  const tRef = await getTranslations('reference');
  const client = await apiAsUser();
  if (!client) return redirectToSignIn();

  const { data: profile, error } = await client.GET('/v1/me/talent-profile');
  if (!profile) {
    const failure = toActionFailure(error);
    if (failure.code === 'UNAUTHENTICATED') return redirectToSignIn();
    if (failure.code !== 'NOT_FOUND') {
      throw new Error(`API ${failure.code} (request ${failure.requestId ?? 'unknown'})`);
    }
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
        <h1 className="text-2xl font-bold">{t('empty.title')}</h1>
        <p className="text-muted-foreground">{t('empty.body')}</p>
        <Link href="/me/talent-profile/edit" className={cn(buttonVariants(), 'min-h-11')}>
          {t('empty.create')}
        </Link>
        <SignOutButton />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <h1 className="sr-only">{t('title')}</h1>
      <Alert variant={profile.hiddenAt ? 'destructive' : 'default'}>
        <AlertDescription>
          {profile.hiddenAt ? t('status.hidden') : t(`status.${profile.status}`)}
        </AlertDescription>
      </Alert>
      <p className="text-sm text-muted-foreground">
        {t('publicUrl', { url: `/t/${profile.slug}` })}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/me/talent-profile/edit"
          className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
        >
          {t('edit')}
        </Link>
        {profile.status === 'PUBLISHED' && !profile.hiddenAt && (
          <Link
            href={`/t/${profile.slug}`}
            className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
          >
            {t('viewPublic')}
          </Link>
        )}
        <ProfileStatusActions status={profile.status} />
      </div>

      <TalentProfileView profile={profile} />

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('contacts')}</h2>
        <ul className="flex flex-col gap-1">
          {profile.contactMethods.map((method) => (
            <li key={method.id}>
              <span className="text-muted-foreground">{tRef(`contactTypes.${method.type}`)}: </span>
              {method.value}
            </li>
          ))}
        </ul>
      </section>

      <SignOutButton />
    </main>
  );
}
