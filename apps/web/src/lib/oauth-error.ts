import { OAUTH_CALLBACK_ERRORS, type OAuthCallbackError } from '@skillboard/shared';

/**
 * `?error=` on `/sign-in` comes from the URL, so only the two codes the API's Google callback may use are
 * shown; anything else (a hand-made link) becomes the generic failure instead of echoing text.
 */
export function oauthErrorKey(value: string | string[]): OAuthCallbackError {
  const known = OAUTH_CALLBACK_ERRORS.find((code) => code === value);
  return known ?? 'OAUTH_FAILED';
}
