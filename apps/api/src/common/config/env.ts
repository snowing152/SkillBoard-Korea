import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

/**
 * Every environment variable the API reads, validated once at boot (ADR 0018).
 * Boot fails loudly on a missing or malformed value; nothing else reads process.env.
 */
export const EnvSchema = z
  .object({
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
    /** Signs access tokens (ADR 0009). Separate from the refresh-token pepper (ADR 0018). */
    JWT_ACCESS_SECRET: z.string().min(32),
    /** Access-token lifetime. 15 min per ADR 0009; the refresh token renews it (ADR 0020). */
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
    /** Mixed into the sha256 of every refresh, verification and reset token before it is stored. */
    JWT_REFRESH_PEPPER: z.string().min(32),
    REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    /** A token rotated less than this many seconds ago is a concurrent refresh, not a replay (ADR 0020). */
    REFRESH_GRACE_SECONDS: z.coerce.number().int().min(0).max(120).default(30),
    /** `console` prints the link instead of sending; it is refused in production so no token is logged there. */
    EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(3).default('SkillBoard Korea <noreply@localhost>'),
    /** All three set = Google sign-in on; any missing = the Google routes answer NOT_FOUND. */
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_CALLBACK_URL: z.url().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Required when EMAIL_PROVIDER=resend',
      });
    }
    if (env.EMAIL_PROVIDER === 'console' && env.NODE_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_PROVIDER'],
        message: 'console is for development and test only; use resend in production',
      });
    }
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

/**
 * Reads an optional string variable. `ConfigService<Env, true>` types `.get()` of an optional key as
 * `never`, which hides the `undefined` a caller must handle; this returns it honestly.
 */
export function optionalEnv(config: ConfigService<Env, true>, key: keyof Env): string | undefined {
  const value: unknown = config.get(key, { infer: true });
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
