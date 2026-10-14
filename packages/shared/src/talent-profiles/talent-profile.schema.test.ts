import { describe, expect, it } from 'vitest';
import {
  CreateTalentProfileSchema,
  TalentProfileSchema,
  UpdateTalentProfileSchema,
} from './talent-profile.schema.js';

const SKILL_ID = '019a0000-0000-7000-8000-000000000001';

const valid = {
  headline: '  Russian tutor for kids in Seoul  ',
  description: 'Ten years of teaching Russian to children aged 5 to 12, online and at home.',
  cityCode: 'SEOUL',
  workMode: 'HYBRID',
  visaType: 'F-6',
  videoUrl: 'https://youtu.be/abc123',
  skillIds: [SKILL_ID],
  languages: [{ languageCode: 'ru', level: 'NATIVE' }],
  portfolioLinks: [{ url: 'https://example.com/portfolio', label: null }],
  contactMethods: [{ type: 'TELEGRAM', value: '@anna' }],
  acknowledgeVisaDisclaimer: true,
};

describe('CreateTalentProfileSchema', () => {
  it('trims text and accepts a complete profile', () => {
    const parsed = CreateTalentProfileSchema.parse(valid);
    expect(parsed.headline).toBe('Russian tutor for kids in Seoul');
  });

  it('enforces headline and description limits', () => {
    expect(CreateTalentProfileSchema.safeParse({ ...valid, headline: 'ab' }).success).toBe(false);
    expect(
      CreateTalentProfileSchema.safeParse({ ...valid, description: 'too short' }).success,
    ).toBe(false);
    expect(
      CreateTalentProfileSchema.safeParse({ ...valid, headline: 'x'.repeat(81) }).success,
    ).toBe(false);
  });

  it('rejects non-http links and unknown codes', () => {
    expect(
      CreateTalentProfileSchema.safeParse({ ...valid, videoUrl: 'ftp://x.com/v' }).success,
    ).toBe(false);
    expect(
      CreateTalentProfileSchema.safeParse({ ...valid, videoUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(CreateTalentProfileSchema.safeParse({ ...valid, cityCode: 'PARIS' }).success).toBe(
      false,
    );
    expect(CreateTalentProfileSchema.safeParse({ ...valid, visaType: 'F2' }).success).toBe(false);
  });

  it('requires at least one skill and one language, without duplicates', () => {
    expect(CreateTalentProfileSchema.safeParse({ ...valid, skillIds: [] }).success).toBe(false);
    expect(
      CreateTalentProfileSchema.safeParse({ ...valid, skillIds: [SKILL_ID, SKILL_ID] }).success,
    ).toBe(false);
    expect(CreateTalentProfileSchema.safeParse({ ...valid, languages: [] }).success).toBe(false);
    expect(
      CreateTalentProfileSchema.safeParse({
        ...valid,
        languages: [
          { languageCode: 'ru', level: 'NATIVE' },
          { languageCode: 'ru', level: 'BASIC' },
        ],
      }).success,
    ).toBe(false);
  });

  it('requires the visa disclaimer to be acknowledged', () => {
    const { acknowledgeVisaDisclaimer: _flag, ...without } = valid;
    expect(CreateTalentProfileSchema.safeParse(without).success).toBe(false);
    expect(
      CreateTalentProfileSchema.safeParse({ ...valid, acknowledgeVisaDisclaimer: false }).success,
    ).toBe(false);
  });

  it('allows one value per contact type', () => {
    expect(
      CreateTalentProfileSchema.safeParse({
        ...valid,
        contactMethods: [
          { type: 'EMAIL', value: 'a@b.co' },
          { type: 'EMAIL', value: 'c@d.co' },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('UpdateTalentProfileSchema', () => {
  it('accepts a partial body and the status field', () => {
    expect(UpdateTalentProfileSchema.parse({ status: 'PUBLISHED' })).toEqual({
      status: 'PUBLISHED',
    });
    expect(UpdateTalentProfileSchema.safeParse({ status: 'HIDDEN' }).success).toBe(false);
  });

  it('never asks for the disclaimer again on edits', () => {
    expect('acknowledgeVisaDisclaimer' in UpdateTalentProfileSchema.shape).toBe(false);
  });
});

describe('TalentProfileSchema', () => {
  it('has no contactMethods key, so the public response cannot leak them', () => {
    expect('contactMethods' in TalentProfileSchema.shape).toBe(false);
    expect('status' in TalentProfileSchema.shape).toBe(false);
  });
});
