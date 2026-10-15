import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  EMPTY_TALENT_PROFILE,
  TalentProfileForm,
  type TalentProfileFormValues,
} from '@/components/talent-profile/talent-profile-form';
import { PageContainer, PageHeader } from '@/components/ds/page';
import { api, apiAsUser } from '@/lib/api';
import { toActionFailure } from '@/lib/api-errors';
import { redirectToSignIn } from '@/lib/session';
import { toFormValues } from '@/lib/talent-profile-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile.form');
  return { title: t('editTitle') };
}

/** One page for create and edit: the mode depends on whether the user already has a profile. */
export default async function EditTalentProfilePage() {
  const t = await getTranslations('profile.form');
  const client = await apiAsUser();
  if (!client) return redirectToSignIn();

  const [catalog, profile] = await Promise.all([
    api.GET('/v1/skills'),
    client.GET('/v1/me/talent-profile'),
  ]);
  if (!catalog.data) throw new Error(`API ${toActionFailure(catalog.error).code} loading skills`);

  let mode: 'create' | 'edit' = 'edit';
  let defaultValues: TalentProfileFormValues = EMPTY_TALENT_PROFILE;
  if (profile.data) {
    defaultValues = toFormValues(profile.data);
  } else {
    const failure = toActionFailure(profile.error);
    if (failure.code === 'UNAUTHENTICATED') return redirectToSignIn();
    if (failure.code !== 'NOT_FOUND') throw new Error(`API ${failure.code} loading profile`);
    mode = 'create';
  }

  return (
    <PageContainer width="form">
      <PageHeader title={mode === 'create' ? t('createTitle') : t('editTitle')} />
      <TalentProfileForm mode={mode} catalog={catalog.data} defaultValues={defaultValues} />
    </PageContainer>
  );
}
