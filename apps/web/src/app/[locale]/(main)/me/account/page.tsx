import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PasswordSection } from '@/components/account/password-section';
import { ProfileForm } from '@/components/account/profile-form';
import { ResendVerificationButton } from '@/components/auth/resend-verification-button';
import { PageContainer, PageHeader, Section } from '@/components/ds/page';
import { ConsentList } from '@/components/legal/consent-list';
import { Badge } from '@/components/ui/badge';
import { apiAsUser } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';
import { redirectToSignIn } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account');
  return { title: t('title') };
}

/**
 * Settings: profile (name, language), email status, password, accepted documents. The `account-deletion`
 * spec adds the danger zone below the list.
 */
export default async function MyAccountPage() {
  const t = await getTranslations('account');
  const client = await apiAsUser();
  if (!client) return redirectToSignIn();

  const [me, consents] = await Promise.all([client.GET('/v1/me'), client.GET('/v1/me/consents')]);
  if (!me.data || !consents.data) {
    const failure = toActionFailure(me.data ? consents.error : me.error);
    if (failure.code === 'UNAUTHENTICATED') return redirectToSignIn();
    throw new Error(`API ${failure.code} (request ${failure.requestId ?? 'unknown'})`);
  }
  const user = me.data;

  return (
    <PageContainer width="form">
      <PageHeader title={t('title')} />

      <Section>
        <ProfileForm displayName={user.displayName} locale={user.locale} />
      </Section>

      <Section title={t('email.title')}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body break-all">{user.email}</span>
          <Badge variant={user.emailVerified ? 'success' : 'warning'}>
            {user.emailVerified ? t('email.verified') : t('email.unverified')}
          </Badge>
        </div>
        {!user.emailVerified && <ResendVerificationButton variant="outline" />}
      </Section>

      <Section title={t('password.title')}>
        <PasswordSection hasPassword={user.hasPassword} />
      </Section>

      <ConsentList items={consents.data.items} />
    </PageContainer>
  );
}
