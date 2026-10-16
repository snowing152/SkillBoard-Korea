/**
 * Passwords used by web unit tests and Playwright, in one file (GitGuardian ignores exactly this path,
 * see `.gitguardian.yaml`). Fake test values only. Tests import from here and never inline a password.
 */

/** The password of every seeded user (`apps/api/prisma/seed.ts`, README) and of accounts the e2e creates. */
export const SEED_PASSWORD = 'Password123!';
export const TEST_NEW_PASSWORD = 'Another-pass-456!';
