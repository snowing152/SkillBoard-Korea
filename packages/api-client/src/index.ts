import createClient, { type ClientOptions } from 'openapi-fetch';
import type { paths } from './schema.js';

export type { components, paths } from './schema.js';

/**
 * Create a typed client. Works in Next.js (server and client components) and React Native,
 * because openapi-fetch only uses the global `fetch`.
 *
 *   const api = createApiClient({ baseUrl: 'http://localhost:3001' });
 *   const { data, error } = await api.GET('/v1/health');
 */
export function createApiClient(options: ClientOptions & { baseUrl: string }) {
  return createClient<paths>(options);
}
export type ApiClient = ReturnType<typeof createApiClient>;
