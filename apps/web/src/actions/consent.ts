'use server';

import { type AcceptConsents, AcceptConsentsSchema } from '@skillboard/shared';
import { revalidatePath } from 'next/cache';
import { apiAsUser } from '@/lib/api';
import { type ActionResult, toActionFailure } from '@/lib/api-errors';

/** Records the acceptance of the current version of each document; the API stamps the version. */
export async function acceptConsents(input: AcceptConsents): Promise<ActionResult> {
  const parsed = AcceptConsentsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
  const client = await apiAsUser();
  if (!client) return { ok: false, code: 'UNAUTHENTICATED' };

  try {
    const { data, error } = await client.POST('/v1/me/consents', { body: parsed.data });
    if (!data) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  // /me/* layouts decided to redirect from the previous state; drop the cached render.
  revalidatePath('/', 'layout');
  return { ok: true, data: undefined }; // the form navigates to `next`
}
