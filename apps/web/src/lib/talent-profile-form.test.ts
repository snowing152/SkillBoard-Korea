import { CreateTalentProfileSchema, type MyTalentProfile } from '@skillboard/shared';
import { describe, expect, it } from 'vitest';
import { toFormValues } from './talent-profile-form';

const profile: MyTalentProfile = {
  id: '019a0000-0000-7000-8000-000400000001',
  slug: 'anna-petrova',
  displayName: 'Anna Petrova',
  headline: 'Russian tutor for kids',
  description: 'Ten years of teaching Russian to children in Seoul, online and at home.',
  photoUrl: null,
  videoUrl: 'https://youtu.be/abc',
  cityCode: 'SEOUL',
  workMode: 'HYBRID',
  visaType: 'F-6',
  publishedAt: null,
  skills: [
    {
      id: '019a0000-0000-7000-8000-000200000001',
      slug: 'russian-tutor',
      names: { en: 'Russian tutor' },
    },
  ],
  languages: [{ languageCode: 'ru', level: 'NATIVE' }],
  portfolioLinks: [
    { id: '019a0000-0000-7000-8000-000500000001', url: 'https://example.com', label: null },
  ],
  status: 'DRAFT',
  hiddenAt: null,
  contactMethods: [
    { id: '019a0000-0000-7000-8000-000600000001', type: 'TELEGRAM', value: '@anna' },
  ],
  createdAt: '2026-10-14T00:00:00.000Z',
  updatedAt: '2026-10-14T00:00:00.000Z',
};

describe('toFormValues', () => {
  it('produces values that the create schema accepts, dropping ids and server-only fields', () => {
    const values = toFormValues(profile);
    expect(CreateTalentProfileSchema.safeParse(values).success).toBe(true);
    expect(values.skillIds).toEqual([profile.skills[0]?.id]);
    expect(values.portfolioLinks[0]).toEqual({ url: 'https://example.com', label: null });
    expect(values).not.toHaveProperty('status');
    expect(values).not.toHaveProperty('slug');
  });
});
