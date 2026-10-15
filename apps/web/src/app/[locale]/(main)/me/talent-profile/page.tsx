import { UserRoundPlusIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { PageContainer, PageHeader, Section } from '@/components/ds/page';
import { EmptyState } from '@/components/ds/states';
import { ProfileStatusActions } from '@/components/talent-profile/profile-status-actions';
import { TalentProfileView } from '@/components/talent-profile/talent-profile-view';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { apiAsUser } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';
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
      <PageContainer>
        <EmptyState
          as="h1"
          icon={<UserRoundPlusIcon />}
          title={t('empty.title')}
          body={t('empty.body')}
          action={
            <Link href="/me/talent-profile/edit" className={buttonVariants()}>
              {t('empty.create')}
            </Link>
          }
        />
        <div className="self-center">
          <SignOutButton />
        </div>
      </PageContainer>
    );
  }

  const statusVariant = profile.hiddenAt
    ? 'destructive'
    : profile.status === 'PUBLISHED'
      ? 'success'
      : 'warning';

  return (
    <PageContainer>
      <PageHeader title={t('title')}>
        <Alert variant={statusVariant}>
          <AlertDescription>
            {profile.hiddenAt ? t('status.hidden') : t(`status.${profile.status}`)}
          </AlertDescription>
        </Alert>
        <p className="text-label break-all text-muted-foreground">
          {t('publicUrl', { url: `/t/${profile.slug}` })}
        </p>
      </PageHeader>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href="/me/talent-profile/edit" className={buttonVariants({ variant: 'outline' })}>
          {t('edit')}
        </Link>
        {profile.status === 'PUBLISHED' && !profile.hiddenAt && (
          <Link href={`/t/${profile.slug}`} className={buttonVariants({ variant: 'outline' })}>
            {t('viewPublic')}
          </Link>
        )}
        <ProfileStatusActions status={profile.status} />
      </div>

      {/* Full-bleed on phones, like the public page, so the owner sees what visitors see. */}
      <div className="-mx-gutter sm:mx-0">
        <TalentProfileView profile={profile} nameAs="h2" />
      </div>

      <Section title={t('contacts')}>
        <dl className="flex flex-col divide-y">
          {profile.contactMethods.map((method) => (
            <div key={method.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
              <dt className="text-label text-muted-foreground">
                {tRef(`contactTypes.${method.type}`)}
              </dt>
              <dd className="text-body-sm font-medium break-all">{method.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="self-start">
        <SignOutButton />
      </div>
    </PageContainer>
  );
}
