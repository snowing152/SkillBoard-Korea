'use server';

import {
  type CreateTalentProfile,
  CreateTalentProfileSchema,
  type ProfileStatus,
  ProfileStatusSchema,
} from '@skillboard/shared';
import { revalidatePath } from 'next/cache';
import { apiAsUser } from '@/lib/api';
import { type ActionResult, toActionFailure } from '@/lib/api-errors';

/** Create or replace the whole profile from the form. The API validates again with the same schema. */
export async function saveTalentProfile(
  mode: 'create' | 'edit',
  input: CreateTalentProfile,
): Promise<ActionResult> {
  const parsed = CreateTalentProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
  const client = await apiAsUser();
  if (!client) return { ok: false, code: 'UNAUTHENTICATED' };

  try {
    const { data, error } =
      mode === 'create'
        ? await client.POST('/v1/me/talent-profile', { body: parsed.data })
        : await client.PATCH('/v1/me/talent-profile', { body: parsed.data });
    if (!data) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  // Pages that read the profile are dynamic (they read the session cookie), but the client-side
  // router cache may still hold the previous render; the blunt layout-wide revalidate is fine at MVP size.
  revalidatePath('/', 'layout');
  return { ok: true, data: undefined }; // the form navigates to /me/talent-profile
}

export async function setTalentProfileStatus(status: ProfileStatus): Promise<ActionResult> {
  const parsed = ProfileStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
  const client = await apiAsUser();
  if (!client) return { ok: false, code: 'UNAUTHENTICATED' };

  try {
    const { data, error } = await client.PATCH('/v1/me/talent-profile', {
      body: { status: parsed.data },
    });
    if (!data) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  revalidatePath('/', 'layout');
  return { ok: true, data: undefined };
}
