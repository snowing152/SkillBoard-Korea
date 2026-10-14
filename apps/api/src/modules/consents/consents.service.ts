import { Injectable } from '@nestjs/common';
import {
  type ConsentList,
  DEFAULT_LOCALE,
  type LegalDocument,
  LEGAL_VERSIONS,
  type Locale,
  LocaleSchema,
  SIGNUP_CONSENT_DOCUMENTS,
} from '@skillboard/shared';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Versioned consent (PIPA, ADR 0018). A `Consent` row says "this user accepted this version of this
 * document in this language at this time". A new document version adds a row and keeps the old one,
 * so the history is the proof. The current versions come from `LEGAL_VERSIONS` in packages/shared,
 * the same list the web shows on the legal pages.
 */
@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores the acceptance of the current version of each document. Callers that already run a
   * transaction (profile creation, sign-up) pass their `tx` so the consent and the thing it covers
   * commit together. `skipDuplicates` makes a second acceptance of the same version a no-op.
   */
  async record(
    userId: string,
    documents: readonly LegalDocument[],
    locale: Locale,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    await db.consent.createMany({
      data: [...new Set(documents)].map((type) => ({
        userId,
        type,
        version: LEGAL_VERSIONS[type],
        locale,
      })),
      skipDuplicates: true,
    });
  }

  /** Everyone accepts the sign-up documents; people with a talent profile also the visa disclaimer. */
  async requiredFor(userId: string): Promise<LegalDocument[]> {
    const profile = await this.prisma.talentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile
      ? [...SIGNUP_CONSENT_DOCUMENTS, 'VISA_DISCLAIMER']
      : [...SIGNUP_CONSENT_DOCUMENTS];
  }

  /** Required documents that have no row at the current version. Empty = the user may continue. */
  async pendingFor(userId: string): Promise<LegalDocument[]> {
    const [required, accepted] = await Promise.all([
      this.requiredFor(userId),
      this.prisma.consent.findMany({
        where: { userId },
        select: { type: true, version: true },
      }),
    ]);
    return required.filter(
      (type) => !accepted.some((c) => c.type === type && c.version === LEGAL_VERSIONS[type]),
    );
  }

  async listForUser(userId: string): Promise<ConsentList> {
    const [rows, pending] = await Promise.all([
      this.prisma.consent.findMany({
        where: { userId },
        orderBy: { acceptedAt: 'desc' },
        select: { type: true, version: true, locale: true, acceptedAt: true },
      }),
      this.pendingFor(userId),
    ]);
    return {
      items: rows.map((row) => ({
        type: row.type,
        version: row.version,
        // A plain text column: fall back rather than fail if a locale was removed from LOCALES later.
        locale: LocaleSchema.catch(DEFAULT_LOCALE).parse(row.locale),
        acceptedAt: row.acceptedAt.toISOString(),
      })),
      pending,
    };
  }

  /** POST handler body: record, then return the fresh list so the client sees `pending` empty. */
  async accept(
    userId: string,
    documents: readonly LegalDocument[],
    locale: Locale,
  ): Promise<ConsentList> {
    await this.record(userId, documents, locale);
    return this.listForUser(userId);
  }
}
