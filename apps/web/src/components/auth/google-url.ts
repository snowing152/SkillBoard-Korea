import { DEFAULT_LOCALE, type Locale, type SignupRole } from '@skillboard/shared';

/**
 * Link to the web app's own start route `/[locale]/auth/google`, which sets a nonce cookie and forwards to
 * `GET /v1/auth/google` (login CSRF, ADR 0024). `role` comes along from the sign-up page only to
 * preselect it on the role-choice step, where every new Google user gives the consent (ADR 0025): a link
 * never carries one. Pure, so it is tested.
 */
export function googleStartPath(params: {
  role?: SignupRole | undefined;
  locale: Locale;
  next?: string | undefined;
}): string {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.next) query.set('next', params.next);
  // English has no prefix, the other languages do (`localePrefix: 'as-needed'`, ADR 0008).
  const prefix = params.locale === DEFAULT_LOCALE ? '' : `/${params.locale}`;
  const search = query.toString();
  return `${prefix}/auth/google${search ? `?${search}` : ''}`;
}
