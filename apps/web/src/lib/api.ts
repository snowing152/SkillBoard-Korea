import { createApiClient } from '@skillboard/api-client';
import { env } from '@/env';
import { getAccessToken } from '@/lib/session';

/**
 * Server-side API clients (Server Components and Server Actions only: `env.API_URL` and the session
 * cookie never reach the browser). Both are plain `fetch` under the hood, so the same calls work in the
 * future React Native app with a token from secure storage instead of a cookie.
 */

/** Anonymous client for public pages (home, talent list, public profile). */
export const api = createApiClient({ baseUrl: env.API_URL });

/** Client that sends the signed-in user's access token, or null when there is no session. */
export async function apiAsUser() {
  const token = await getAccessToken();
  if (!token) return null;
  return createApiClient({
    baseUrl: env.API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
}
