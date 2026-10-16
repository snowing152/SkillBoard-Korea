import { TEST_JWT_SECRET, TEST_TOKEN_PEPPER } from '../../../test/fixtures/credentials.js';
import { validateEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: TEST_JWT_SECRET,
  JWT_REFRESH_PEPPER: TEST_TOKEN_PEPPER,
};

describe('validateEnv', () => {
  it('requires NODE_ENV: a deploy that forgets it must not boot as development', () => {
    // With a default, the production-only refusals below were silently skipped.
    expect(() => validateEnv({ ...base, RATE_LIMIT_DISABLED: 'true' })).toThrow(/NODE_ENV/);
  });

  it('refuses the console mailer and a disabled limiter in production', () => {
    const production = { ...base, NODE_ENV: 'production' };
    expect(() => validateEnv(production)).toThrow(/EMAIL_PROVIDER/);
    expect(() =>
      validateEnv({
        ...production,
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 'k',
        RATE_LIMIT_DISABLED: 'true',
      }),
    ).toThrow(/RATE_LIMIT_DISABLED/);
  });

  it('defaults the refresh grace window to 120 s, long enough for a cold API start', () => {
    // Safe since a repeat inside the window gets the same successor (ADR 0025).
    expect(validateEnv({ ...base, NODE_ENV: 'test' }).REFRESH_GRACE_SECONDS).toBe(120);
  });

  it('accepts both in development and test', () => {
    for (const NODE_ENV of ['development', 'test']) {
      expect(validateEnv({ ...base, NODE_ENV, RATE_LIMIT_DISABLED: 'true' })).toMatchObject({
        NODE_ENV,
        EMAIL_PROVIDER: 'console',
        RATE_LIMIT_DISABLED: true,
      });
    }
  });
});
