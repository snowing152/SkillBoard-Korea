import type { Locale, SignupRole } from '@skillboard/shared';

/**
 * `GET /v1/auth/google?locale&next` plus `role&acceptTerms=true` from the sign-up page, where the person
 * picked a role and ticked the consent box. Pure, so it is tested.
 */
export function googleStartUrl(
  base: string,
  params: { role?: SignupRole | undefined; locale: Locale; next?: string | undefined },
): string {
  const query = new URLSearchParams({ locale: params.locale });
  // Role and consent go together, and only from the sign-up page. Without them (sign-in page) an
  // unknown Google user is sent to the role-choice step.
  if (params.role) {
    query.set('role', params.role);
    query.set('acceptTerms', 'true');
  }
  if (params.next) query.set('next', params.next);
  return `${base}/v1/auth/google?${query.toString()}`;
}
