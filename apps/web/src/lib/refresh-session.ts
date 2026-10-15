import { type AuthSession, AuthSessionSchema } from '@skillboard/shared';
import { env } from '@/env';

const TIMEOUT_MS = 5000;

/**
 * `REJECTED`: the API says this refresh token is not valid (expired, revoked, replayed): drop the cookie.
 * `UNAVAILABLE`: network error, timeout or a 5xx (the API may be waking up, ADR 0013): keep the cookie
 * and continue signed out for this request; the next request tries again.
 */
export type RefreshResult =
  { ok: true; session: AuthSession } | { ok: false; reason: 'REJECTED' | 'UNAVAILABLE' };

/**
 * Plain `fetch` to `POST /v1/auth/refresh` (ADR 0020). Used by the proxy, which runs before any page and
 * cannot use the Server Action helpers. `fetchImpl` exists for unit tests.
 */
export async function refreshSession(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RefreshResult> {
  try {
    const res = await fetchImpl(`${env.API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 400) return { ok: false, reason: 'REJECTED' };
    if (!res.ok) return { ok: false, reason: 'UNAVAILABLE' };
    const parsed = AuthSessionSchema.safeParse(await res.json());
    return parsed.success
      ? { ok: true, session: parsed.data }
      : { ok: false, reason: 'UNAVAILABLE' };
  } catch {
    return { ok: false, reason: 'UNAVAILABLE' };
  }
}
