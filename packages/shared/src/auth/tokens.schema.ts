import { z } from 'zod';
import { LocaleSchema } from '../i18n/locales.js';
import { SIGNUP_ROLES } from './roles.js';
import { EmailSchema, PasswordSchema } from './auth.schema.js';
import { SafePathSchema } from './safe-path.js';

/** An opaque random token (refresh, verification, reset, exchange code) as it travels in a body. */
const OpaqueTokenSchema = z.string().min(20).max(200);

export const RefreshSchema = z.object({ refreshToken: OpaqueTokenSchema });
export type Refresh = z.infer<typeof RefreshSchema>;

/** `all: true` signs out every device. Without a token and without `all` there is nothing to revoke. */
export const LogoutSchema = z.object({
  refreshToken: OpaqueTokenSchema.optional(),
  all: z.boolean().default(false),
});
export type Logout = z.infer<typeof LogoutSchema>;

/** Email verification link token. */
export const TokenSchema = z.object({ token: OpaqueTokenSchema });
export type TokenInput = z.infer<typeof TokenSchema>;

export const PasswordResetRequestSchema = z.object({ email: EmailSchema });
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: OpaqueTokenSchema,
  password: PasswordSchema,
});
export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;

/** The single-use 60 s code the Google callback puts in the redirect URL (never a token). */
export const ExchangeSchema = z.object({ code: OpaqueTokenSchema });
export type Exchange = z.infer<typeof ExchangeSchema>;

/**
 * Query of GET /v1/auth/google. `acceptTerms` is the string `'true'` because it travels in a URL.
 * From the sign-up page the person has already chosen a role and ticked the box, so both come along and
 * a new account is created at once. From the sign-in page neither is known: a Google user without an
 * account is then sent to a role-choice step instead of being created silently. Role and consent always
 * travel together.
 */
export const GoogleStartQuerySchema = z
  .object({
    role: z.enum(SIGNUP_ROLES).optional(),
    locale: LocaleSchema,
    acceptTerms: z.literal('true').optional(),
    next: SafePathSchema.optional(),
    /**
     * Random value the web app keeps in its own cookie and expects back in the final redirect, so that a
     * callback link made in someone else's browser is useless (login CSRF). Opaque to the API.
     */
    webNonce: z
      .string()
      .regex(/^[A-Za-z0-9_-]{16,64}$/)
      .optional(),
  })
  .refine((q) => (q.role === undefined) === (q.acceptTerms === undefined), {
    path: ['acceptTerms'],
    message: 'role and acceptTerms must be sent together',
  });
export type GoogleStartQuery = z.infer<typeof GoogleStartQuerySchema>;

/**
 * POST /v1/auth/google/complete: the role-choice step for a Google user who has no account yet.
 * `signupToken` is the short-lived opaque token the callback handed to the web server (never to
 * browser JavaScript); it names the Google identity, the body only adds the person's choices.
 */
export const GoogleCompleteSchema = z.object({
  signupToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  role: z.enum(SIGNUP_ROLES),
  locale: LocaleSchema,
  acceptTerms: z.literal(true),
});
export type GoogleComplete = z.infer<typeof GoogleCompleteSchema>;
