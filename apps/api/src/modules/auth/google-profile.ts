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
  /** Only a preselection for the role step (ADR 0025); never creates an account or a consent. */
  role: z.enum(SIGNUP_ROLES).optional(),
  locale: LocaleSchema,
  next: SafePathSchema.optional(),
  /** Also stored in an httpOnly cookie on the API origin; the callback needs both to match. */
  nonce: z.string().min(1),
  /** Chosen by the web app's start route and echoed back in the final redirect (see the web callback). */
  webNonce: z.string().optional(),
});
export type OAuthState = z.infer<typeof OAuthStateSchema>;
