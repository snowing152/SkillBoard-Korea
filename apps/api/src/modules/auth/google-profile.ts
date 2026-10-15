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
  role: z.enum(SIGNUP_ROLES),
  locale: LocaleSchema,
  next: SafePathSchema.optional(),
  nonce: z.string().min(1),
});
export type OAuthState = z.infer<typeof OAuthStateSchema>;
