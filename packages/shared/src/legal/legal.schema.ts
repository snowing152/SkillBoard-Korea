import { z } from 'zod';
import { LocaleSchema } from '../i18n/locales.js';
import { LEGAL_DOCUMENTS } from './legal.js';

export const LegalDocumentSchema = z.enum(LEGAL_DOCUMENTS);

/** One accepted document version. The history is kept: a new version adds a row, never replaces. */
export const ConsentSchema = z.object({
  type: LegalDocumentSchema,
  version: z.string().max(20),
  locale: LocaleSchema.meta({ description: 'UI language the user saw when accepting' }),
  acceptedAt: z.iso.datetime(),
});
export type Consent = z.infer<typeof ConsentSchema>;

/** No cursor: a user has a handful of rows. `pending` = documents still to accept at the current version. */
export const ConsentListSchema = z.object({
  items: z.array(ConsentSchema),
  pending: z.array(LegalDocumentSchema),
});
export type ConsentList = z.infer<typeof ConsentListSchema>;

/** POST /v1/me/consents. The server stamps the current version of each document. */
export const AcceptConsentsSchema = z.object({
  documents: z.array(LegalDocumentSchema).min(1).max(LEGAL_DOCUMENTS.length),
  locale: LocaleSchema,
});
export type AcceptConsents = z.infer<typeof AcceptConsentsSchema>;
