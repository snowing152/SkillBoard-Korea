'use server';

import {
  type ChangePassword,
  ChangePasswordSchema,
  type Locale,
  LocaleSchema,
  type UpdateMe,
  UpdateMeSchema,
} from '@skillboard/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from '@/i18n/navigation';
import { apiAsUser } from '@/lib/api';
import { getRefreshToken } from '@/lib/session';
import { type ActionResult, toActionFailure } from '@/lib/api-errors';

/**
 * Saves display name and UI language. When the language changed, the page is re-opened under that
 * locale's URL prefix (the prefix is the locale, ADR 0008); otherwise the page just refreshes.
 * `currentLocale` comes from the form: `getLocale()` cannot be called inside a Server Action (it reads
 * `next/root-params`, which only works in a route render).
 */
export async function updateAccount(input: UpdateMe, currentLocale: Locale): Promise<ActionResult> {
  const parsed = UpdateMeSchema.safeParse(input);
  const current = LocaleSchema.safeParse(currentLocale);
  if (!parsed.success || !current.success) return { ok: false, code: 'VALIDATION_FAILED' };
  const client = await apiAsUser();
  if (!client) return { ok: false, code: 'UNAUTHENTICATED' };

  try {
    // Only the fields that were sent: the API contract has no explicit `undefined`.
    const body = {
      ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
      ...(parsed.data.locale !== undefined ? { locale: parsed.data.locale } : {}),
    };
    const { data, error } = await client.PATCH('/v1/me', { body });
    if (!data) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  revalidatePath('/', 'layout');
  const next = parsed.data.locale ?? current.data;
  if (next !== current.data) redirect({ href: '/me/account', locale: next });
  return { ok: true, data: undefined };
}

export async function changePassword(input: ChangePassword): Promise<ActionResult> {
  const parsed = ChangePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
  const client = await apiAsUser();
  if (!client) return { ok: false, code: 'UNAUTHENTICATED' };

  try {
    // The refresh cookie names this device's session: the API signs out every other one.
    const refreshToken = await getRefreshToken();
    const { error, response } = await client.POST('/v1/me/password', {
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        ...(refreshToken ? { refreshToken } : {}),
      },
    });
    if (!response.ok) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  return { ok: true, data: undefined };
}

/**
 * A Google-only account has no password to change. "Set a password" is the reset flow: the same email
 * with a link, so the person proves they own the inbox before a password exists.
 */
export async function sendSetPasswordLink(): Promise<ActionResult> {
  const client = await apiAsUser();
  if (!client) return { ok: false, code: 'UNAUTHENTICATED' };

  try {
    const me = await client.GET('/v1/me');
    if (!me.data) return toActionFailure(me.error);
    const { error, response } = await client.POST('/v1/auth/password-reset/request', {
      body: { email: me.data.email },
    });
    if (!response.ok) return toActionFailure(error);
  } catch (err: unknown) {
    return toActionFailure(err);
  }
  return { ok: true, data: undefined };
}
