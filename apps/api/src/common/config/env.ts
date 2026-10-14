import { z } from 'zod';

/**
 * Every environment variable the API reads, validated once at boot (ADR 0018).
 * Boot fails loudly on a missing or malformed value; nothing else reads process.env.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.url(),
  /** Comma-separated browser origins allowed by CORS. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  WEB_URL: z.url().default('http://localhost:3000'),
  /** Signs access tokens (ADR 0009). Separate from any future refresh-token pepper (ADR 0018). */
  JWT_ACCESS_SECRET: z.string().min(32),
  /** Access-token lifetime. 15 min per ADR 0009; refresh tokens arrive with the accounts spec. */
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
});

/** Parsed, typed shape. Inject as `ConfigService<Env, true>` and read with `get('KEY', { infer: true })`. */
export type Env = z.output<typeof EnvSchema>;

/** Passed to `ConfigModule.forRoot({ validate })`. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${lines.join('\n')}`);
  }
  return result.data;
}
