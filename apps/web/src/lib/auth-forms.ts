import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@skillboard/shared';
import { z } from 'zod';

/**
 * Form-only schemas: the API schemas plus the "type it twice" check, which the server never sees.
 * The `custom` issue is mapped to a message key by the form (`auth.reset.mismatch`).
 */
export const ResetPasswordFormSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
    repeat: z.string().min(1),
  })
  .refine((v) => v.password === v.repeat, { path: ['repeat'], message: 'mismatch' });
export type ResetPasswordForm = z.infer<typeof ResetPasswordFormSchema>;

/** Where a signed-in user lands when no `?next=` was given: talents manage their profile first. */
export function defaultLandingPath(roles: readonly string[]): string {
  return roles.includes('TALENT') ? '/me/talent-profile' : '/talents';
}
