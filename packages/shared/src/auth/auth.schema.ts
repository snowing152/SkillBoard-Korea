import { z } from 'zod';
import { LocaleSchema } from '../i18n/locales.js';
import { LegalDocumentSchema } from '../legal/legal.schema.js';
import { SIGNUP_ROLES, USER_ROLES } from './roles.js';

export const UserRoleSchema = z.enum(USER_ROLES);

/** Trim and lower-case before the format check (Zod runs string checks in order, ADR 0009). */
export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);
export const DisplayNameSchema = z.string().trim().min(2).max(50);

/**
 * Sign-up. `locale` is the UI language of the sign-up page (the confirmation email and the consent
 * record use it); `acceptTerms` is the one checkbox that covers `SIGNUP_CONSENT_DOCUMENTS`.
 * Role wording in the UI never says "company": a client may be a private person.
 */
export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  displayName: DisplayNameSchema,
  role: z.enum(SIGNUP_ROLES),
  locale: LocaleSchema.default('en'),
  acceptTerms: z.literal(true),
});
export type Register = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type Login = z.infer<typeof LoginSchema>;

/** What a client may know about the signed-in user. Never the password hash (ADR 0018). */
export const AuthUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  roles: z.array(UserRoleSchema),
  locale: LocaleSchema,
  emailVerified: z.boolean(),
  hasPassword: z
    .boolean()
    .meta({ description: 'False for Google-only accounts: they set a password via a reset email' }),
  pendingConsents: z
    .array(LegalDocumentSchema)
    .meta({ description: 'Documents to accept at their current version before using the account' }),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** Response of register, login, refresh and exchange (ADR 0020). The API sets no cookies. */
export const AuthSessionSchema = z.object({
  accessToken: z.string().meta({ description: 'JWT; send as Authorization: Bearer' }),
  expiresInSeconds: z.number().int().positive(),
  refreshToken: z
    .string()
    .max(200)
    .meta({ description: 'Opaque; rotated on every POST /v1/auth/refresh' }),
  refreshExpiresAt: z.iso.datetime(),
  user: AuthUserSchema,
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

/** PATCH /v1/me. Same limits as sign-up. */
export const UpdateMeSchema = z.object({
  displayName: DisplayNameSchema.optional(),
  locale: LocaleSchema.optional(),
});
export type UpdateMe = z.infer<typeof UpdateMeSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: PasswordSchema,
    newPassword: PasswordSchema,
    refreshToken: z.string().min(20).max(200).optional().meta({
      description:
        "The caller's own refresh token: every other session is signed out, this one stays. Omit to sign out all.",
    }),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'New password must differ from the current one',
  });
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
