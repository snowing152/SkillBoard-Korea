import type { Locale, SignupRole } from '@skillboard/shared';

/**
 * `GET /v1/auth/google?role&locale&acceptTerms=true&next` (accounts spec). `acceptTerms` is only ever
 * sent after the person ticked the box or was shown the notice under the button. Pure, so it is tested.
 */
export function googleStartUrl(
  base: string,
  params: { role: SignupRole; locale: Locale; next?: string | undefined },
): string {
  const query = new URLSearchParams({
    role: params.role,
    locale: params.locale,
    acceptTerms: 'true',
  });
  if (params.next) query.set('next', params.next);
  return `${base}/v1/auth/google?${query.toString()}`;
}
