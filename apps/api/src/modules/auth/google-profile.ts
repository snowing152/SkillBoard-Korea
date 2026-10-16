import { LocaleSchema, SafePathSchema, SIGNUP_ROLES } from '@skillboard/shared';
import { z } from 'zod';

/** What the Google strategy hands to the service: only the fields the account logic needs. */
export type GoogleProfile = {
  /** Google's stable `sub`; the email can change, this cannot. */
  id: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

/**
 * Payload of the `state` JWT that carries the sign-up choices through Google and back. It is signed
 * with the access secret but has no `sub`, so the access guard rejects it as a bearer token; and an
 * access token has no `purpose`, so it cannot be replayed as a state.
 */
export const OAuthStateSchema = z.object({
  purpose: z.literal('oauth_state'),
  /** Absent when the flow started on /sign-in: an unknown Google user then picks a role first. */
  role: z.enum(SIGNUP_ROLES).optional(),
  locale: LocaleSchema,
  next: SafePathSchema.optional(),
  /** Also stored in an httpOnly cookie on the API origin; the callback needs both to match. */
  nonce: z.string().min(1),
});
export type OAuthState = z.infer<typeof OAuthStateSchema>;

/**
 * What the role-choice step needs to create the account later: the Google identity as the callback saw
 * it. Signed, short-lived, no `sub` (the access guard rejects it), and it travels from the API to the
 * web server only, then sits in an httpOnly cookie there.
 */
export const OAuthSignupSchema = z.object({
  purpose: z.literal('oauth_signup'),
  googleId: z.string().min(1),
  email: z.string().min(3),
  emailVerified: z.boolean(),
  displayName: z.string().nullable(),
  locale: LocaleSchema,
});
export type OAuthSignup = z.infer<typeof OAuthSignupSchema>;
