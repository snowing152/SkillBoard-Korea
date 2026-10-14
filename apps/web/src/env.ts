import { z } from 'zod';

/**
 * Validated environment for the web app (ADR 0018). NEXT_PUBLIC_* values are inlined by Next at
 * build time, so they must be referenced literally (no dynamic `process.env[name]`).
 */
const EnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  API_URL: z.url(),
});

const parsed = EnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  API_URL: process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
});

if (!parsed.success) {
  throw new Error(`Invalid web environment: ${JSON.stringify(parsed.error.issues)}`);
}

export const env = parsed.data;
