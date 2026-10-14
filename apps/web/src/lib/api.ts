import { createApiClient } from '@skillboard/api-client';
import { env } from '@/env';

/** Server-side client (Server Components, route handlers). Client Components get their own instance later. */
export const api = createApiClient({ baseUrl: env.API_URL });
