/**
 * Passwords used by the schema tests, in one file (GitGuardian ignores exactly this path, see
 * `.gitguardian.yaml`). Fake values that only need to pass or fail the length rules. Tests import from
 * here and never inline a password.
 */
export const TEST_PASSWORD = 'Password123!';
export const TEST_OTHER_PASSWORD = 'Other-456!!';
