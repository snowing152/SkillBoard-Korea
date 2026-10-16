import { DEFAULT_LOCALE, type Locale, type SignupRole } from '@skillboard/shared';

/**
 * Link to the web app's own start route `/[locale]/auth/google`, which sets a nonce cookie and forwards to
 * `GET /v1/auth/google` (login CSRF, ADR 0024). `role` and `acceptTerms=true` come along only from the
 * sign-up page, where the person picked a role and ticked the consent box; without them (sign-in page) an
 * unknown Google user is sent to the role-choice step. Pure, so it is tested.
 */
export function googleStartPath(params: {
  role?: SignupRole | undefined;
  locale: Locale;
  next?: string | undefined;
}): string {
  const query = new URLSearchParams();
  if (params.role) {
    query.set('role', params.role);
    query.set('acceptTerms', 'true');
  }
  if (params.next) query.set('next', params.next);
  // English has no prefix, the other languages do (`localePrefix: 'as-needed'`, ADR 0008).
  const prefix = params.locale === DEFAULT_LOCALE ? '' : `/${params.locale}`;
  const search = query.toString();
  return `${prefix}/auth/google${search ? `?${search}` : ''}`;
}
