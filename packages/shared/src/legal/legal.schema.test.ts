import { describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENTS, LEGAL_VERSIONS, SIGNUP_CONSENT_DOCUMENTS } from './legal.js';
import { AcceptConsentsSchema, ConsentListSchema } from './legal.schema.js';

describe('legal constants', () => {
  it('has a version for every document, in ISO date form', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(LEGAL_VERSIONS[doc]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('requires only documents that exist at sign-up', () => {
    for (const doc of SIGNUP_CONSENT_DOCUMENTS) expect(LEGAL_DOCUMENTS).toContain(doc);
    expect(SIGNUP_CONSENT_DOCUMENTS).not.toContain('VISA_DISCLAIMER');
  });
});

describe('AcceptConsentsSchema', () => {
  it('accepts one to three known documents', () => {
    expect(AcceptConsentsSchema.safeParse({ documents: ['PRIVACY'], locale: 'ko' }).success).toBe(
      true,
    );
    expect(
      AcceptConsentsSchema.safeParse({ documents: [...LEGAL_DOCUMENTS], locale: 'en' }).success,
    ).toBe(true);
  });

  it('rejects an empty list, an unknown document and an unknown locale', () => {
    expect(AcceptConsentsSchema.safeParse({ documents: [], locale: 'en' }).success).toBe(false);
    expect(AcceptConsentsSchema.safeParse({ documents: ['COOKIES'], locale: 'en' }).success).toBe(
      false,
    );
    expect(AcceptConsentsSchema.safeParse({ documents: ['TERMS'], locale: 'de' }).success).toBe(
      false,
    );
  });

  it('rejects more than three documents', () => {
    const four = ['TERMS', 'PRIVACY', 'VISA_DISCLAIMER', 'TERMS'];
    expect(AcceptConsentsSchema.safeParse({ documents: four, locale: 'en' }).success).toBe(false);
  });
});

describe('ConsentListSchema', () => {
  it('parses items and pending documents', () => {
    const parsed = ConsentListSchema.parse({
      items: [
        { type: 'TERMS', version: '2026-10-14', locale: 'ru', acceptedAt: '2026-10-14T01:00:00Z' },
      ],
      pending: ['PRIVACY'],
    });
    expect(parsed.pending).toEqual(['PRIVACY']);
  });
});
