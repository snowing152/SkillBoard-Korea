import { Client } from 'pg';

/**
 * Direct database access for the one thing the public API cannot do any more: since sign-up records the
 * consents, a user whose document version is outdated can only be produced by changing the stored row,
 * exactly as a new `LEGAL_VERSIONS` value would. Test code only; the app never talks to the DB from web.
 */
const CONNECTION =
  process.env.DATABASE_URL ?? 'postgresql://skillboard:skillboard@localhost:5432/skillboard';

async function run(sql: string, params: string[], expectedRows: number): Promise<void> {
  const client = new Client({ connectionString: CONNECTION });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    if (result.rowCount !== expectedRows) {
      throw new Error(`expected ${expectedRows} row(s) for the test user, got ${result.rowCount}`);
    }
  } finally {
    await client.end();
  }
}

export function outdateConsent(
  email: string,
  type: 'TERMS' | 'PRIVACY' | 'VISA_DISCLAIMER',
): Promise<void> {
  return run(
    `UPDATE "Consent" SET version = '2020-01-01'
     WHERE type = $2::"ConsentType" AND "userId" = (SELECT id FROM "User" WHERE email = $1)`,
    [email, type],
    1,
  );
}

/**
 * Stands in for clicking the verification link, for flows where verification is a prerequisite and not
 * the flow under test (a published profile is invisible until then). The link flow itself is covered by
 * the API e2e test, which reads the mail.
 */
export function markEmailVerified(email: string): Promise<void> {
  return run(`UPDATE "User" SET "emailVerifiedAt" = now() WHERE email = $1`, [email], 1);
}
