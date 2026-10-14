import { z } from 'zod';
import { LocaleSchema } from '../i18n/locales.js';
import { LegalDocumentSchema } from '../legal/legal.schema.js';
import { SIGNUP_ROLES, USER_ROLES } from './roles.js';

export const UserRoleSchema = z.enum(USER_ROLES);

/** Trim and lower-case before the format check (Zod runs string checks in order, ADR 0009). */
const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
const PasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

/** Minimal sign-up for Phase D; the accounts spec adds consents, locale and email verification. */
export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  displayName: z.string().trim().min(2).max(50),
  role: z.enum(SIGNUP_ROLES),
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
  pendingConsents: z
    .array(LegalDocumentSchema)
    .meta({ description: 'Documents to accept at their current version before using the account' }),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** Response of register and login. Refresh tokens arrive with the accounts spec (ADR 0009). */
export const AuthSessionSchema = z.object({
  accessToken: z.string().meta({ description: 'JWT; send as Authorization: Bearer' }),
  expiresInSeconds: z.number().int().positive(),
  user: AuthUserSchema,
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;
