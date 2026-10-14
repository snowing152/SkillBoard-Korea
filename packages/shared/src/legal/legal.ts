/**
 * The legal documents a user must accept (ADR 0018). The list matches the Prisma `ConsentType` enum;
 * adding a document means adding it there, in a migration, and here.
 */
export const LEGAL_DOCUMENTS = ['TERMS', 'PRIVACY', 'VISA_DISCLAIMER'] as const;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

/**
 * The version id of each document is the ISO date of its last text change. Bump the value when the
 * text in `apps/web/messages/<locale>/legal.json` changes: every user whose accepted version differs
 * is asked to accept again on the next sign-in. The API and the web both read this one list.
 */
export const LEGAL_VERSIONS: Record<LegalDocument, string> = {
  TERMS: '2026-10-14',
  PRIVACY: '2026-10-14',
  VISA_DISCLAIMER: '2026-10-14',
};

/** Official immigration portal, linked from the visa disclaimer. */
export const HIKOREA_URL = 'https://www.hikorea.go.kr';

/** Accepted by everyone at sign-up. `VISA_DISCLAIMER` is added for users who have a talent profile. */
export const SIGNUP_CONSENT_DOCUMENTS: readonly LegalDocument[] = ['TERMS', 'PRIVACY'];
