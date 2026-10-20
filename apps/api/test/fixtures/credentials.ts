/**
 * Every password, key and secret that API tests use, in one file (GitGuardian ignores exactly this path,
 * see `.gitguardian.yaml`). They are fake values for tests; none is, or may become, a real credential.
 * Tests import from here and never write a password or secret inline (`apps/api/CLAUDE.md`).
 */

/** Same value as the seed password (`prisma/seed.ts`, README): the e2e tests sign in as seeded users too. */
export const TEST_PASSWORD = 'Password123!';
export const TEST_NEW_PASSWORD = 'Another-pass-456!';
export const TEST_OTHER_PASSWORD = 'Other-password-1';
export const TEST_RESET_PASSWORD = 'New-password-1';
export const TEST_WRONG_PASSWORD = 'Not-the-password-1';
/** A password that is valid by length but belongs to nobody in a test. */
export const TEST_STRANGER_PASSWORD = 'stranger-password-0';
/**
 * The string the login's constant-time dummy hash was once made from. It signed in to every account
 * without a password (docs/pitfalls.md); a regression test keeps it failing.
 */
export const TEST_FORMER_DUMMY_PASSWORD = 'dummy-password-for-constant-time-login';

/** Unit tests: signs the access tokens of a `JwtModule` that exists only inside the test. */
export const TEST_JWT_SECRET = 'x'.repeat(32);
/** Unit tests: the pepper mixed into token hashes. */
export const TEST_TOKEN_PEPPER = 'p'.repeat(32);
/** E2E defaults when the environment sets nothing (`test/setup-env.ts`). */
export const TEST_E2E_ACCESS_SECRET = 'e2e-only-secret-not-used-anywhere-else-0123456789';
export const TEST_E2E_REFRESH_PEPPER = 'e2e-only-refresh-pepper-not-used-anywhere-0123';

export const TEST_GOOGLE_CLIENT_SECRET = 'google-client-secret-for-tests';
export const TEST_RESEND_API_KEY = 'resend-api-key-for-tests';
