/**
 * The only values the Google callback may put in `?error=` (accounts spec). The web maps anything
 * else to `OAUTH_FAILED`, so a crafted link cannot show arbitrary text.
 */
export const OAUTH_CALLBACK_ERRORS = ['EMAIL_NOT_VERIFIED', 'OAUTH_FAILED'] as const;
export type OAuthCallbackError = (typeof OAUTH_CALLBACK_ERRORS)[number];
