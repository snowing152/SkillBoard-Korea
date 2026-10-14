import { Test } from '@nestjs/testing';
import { MyTalentProfileSchema, TalentCardSchema, TalentProfileSchema } from '@skillboard/shared';
import { firstCallArg } from '../../../test/helpers.js';
import { encodeCursor } from '../../common/pagination/cursor.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { TalentProfilesService } from './talent-profiles.service.js';

const USER_ID = '019a0000-0000-7000-8000-000300000101';
const PROFILE_ID = '019a0000-0000-7000-8000-000400000001';
const SKILL_ID = '019a0000-0000-7000-8000-000200000001';

/** A row in the shape of `profileSelect`, as Prisma would return it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: PROFILE_ID,
    slug: 'anna-petrova',
    headline: 'Russian tutor for kids',
    description: 'Ten years of teaching Russian to children in Seoul, online and at home.',
    photoUrl: null,
    videoUrl: null,
    cityCode: 'SEOUL',
    workMode: 'HYBRID',
    visaType: 'F-6',
    status: 'DRAFT',
    publishedAt: null,
    hiddenAt: null,
    createdAt: new Date('2026-10-14T00:00:00Z'),
    updatedAt: new Date('2026-10-14T00:00:00Z'),
    user: { displayName: 'Anna Petrova' },
    skills: [{ skill: { id: SKILL_ID, slug: 'russian-tutor', names: { en: 'Russian tutor' } } }],
    languages: [{ languageCode: 'ru', level: 'NATIVE' }],
    portfolioLinks: [],
    contactMethods: [
      { id: '019a0000-0000-7000-8000-000600000001', type: 'TELEGRAM', value: '@anna' },
    ],
    ...overrides,
  };
}

const input = {
  headline: 'Russian tutor for kids',
  description: 'Ten years of teaching Russian to children in Seoul, online and at home.',
  cityCode: 'SEOUL' as const,
  workMode: 'HYBRID' as const,
  visaType: 'F-6' as const,
  videoUrl: null,
  skillIds: [SKILL_ID],
  languages: [{ languageCode: 'ru' as const, level: 'NATIVE' as const }],
  portfolioLinks: [],
  contactMethods: [{ type: 'TELEGRAM' as const, value: '@anna' }],
};

describe('TalentProfilesService', () => {
  // One mock object stands in for both the client and the transaction client (`tx`).
  const prisma = {
    talentProfile: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn(), update: jest.fn() },
    skill: { count: jest.fn() },
    talentSkill: { deleteMany: jest.fn() },
    talentLanguage: { deleteMany: jest.fn() },
    portfolioLink: { deleteMany: jest.fn() },
    contactMethod: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: TalentProfilesService;

  beforeEach(async () => {
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
    const moduleRef = await Test.createTestingModule({
      providers: [TalentProfilesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TalentProfilesService);
  });

  describe('listPublic', () => {
    it('filters to publicly visible profiles and returns a cursor when more exist', async () => {
      prisma.talentProfile.findMany.mockResolvedValue([
        row({ status: 'PUBLISHED' }),
        row({ status: 'PUBLISHED', id: '019a0000-0000-7000-8000-000400000002' }),
      ]);
      const page = await service.listPublic({ limit: 1 });

      expect(firstCallArg(prisma.talentProfile.findMany)).toMatchObject({
        where: { status: 'PUBLISHED', hiddenAt: null },
        take: 2,
      });
      expect(page.items).toHaveLength(1);
      expect(TalentCardSchema.safeParse(page.items[0]).success).toBe(true);
      expect(page.nextCursor).toBe(encodeCursor(PROFILE_ID));
    });

    it('decodes the cursor into an id filter and rejects garbage', async () => {
      prisma.talentProfile.findMany.mockResolvedValue([]);
      await service.listPublic({ limit: 20, cursor: encodeCursor(PROFILE_ID) });
      expect(firstCallArg(prisma.talentProfile.findMany)).toMatchObject({
        where: { id: { lt: PROFILE_ID } },
      });
      await expect(service.listPublic({ limit: 20, cursor: 'not-a-cursor' })).rejects.toMatchObject(
        {
          code: 'VALIDATION_FAILED',
        },
      );
    });
  });

  describe('getPublicBySlug', () => {
    it('returns the public shape without contact methods', async () => {
      prisma.talentProfile.findFirst.mockResolvedValue(row({ status: 'PUBLISHED' }));
      const profile = await service.getPublicBySlug('anna-petrova');
      expect(TalentProfileSchema.safeParse(profile).success).toBe(true);
      expect(profile).not.toHaveProperty('contactMethods');
      expect(firstCallArg(prisma.talentProfile.findFirst)).toMatchObject({
        where: { slug: 'anna-petrova', status: 'PUBLISHED', hiddenAt: null },
      });
    });

    it('is NOT_FOUND for draft, hidden or missing alike', async () => {
      prisma.talentProfile.findFirst.mockResolvedValue(null);
      await expect(service.getPublicBySlug('nobody')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('createMine', () => {
    it('rejects a second profile with CONFLICT', async () => {
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'Anna',
        roles: ['TALENT'],
        talentProfile: { id: PROFILE_ID },
      });
      await expect(service.createMine(USER_ID, input)).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('validates skills, derives a slug, grants TALENT and returns the owner view', async () => {
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'Anna Petrova',
        roles: ['CLIENT'],
        talentProfile: null,
      });
      prisma.skill.count.mockResolvedValue(1);
      prisma.talentProfile.create.mockResolvedValue(row());

      const profile = await service.createMine(USER_ID, input);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { roles: { push: 'TALENT' } },
      });
      expect(firstCallArg(prisma.talentProfile.create)).toMatchObject({
        data: {
          userId: USER_ID,
          slug: 'anna-petrova',
          skills: { create: [{ skillId: SKILL_ID }] },
        },
      });
      expect(MyTalentProfileSchema.safeParse(profile).success).toBe(true);
      expect(profile.contactMethods[0]?.value).toBe('@anna');
    });

    it('retries with a suffixed slug when the unique index rejects the first one', async () => {
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'Anna Petrova',
        roles: ['TALENT'],
        talentProfile: null,
      });
      prisma.skill.count.mockResolvedValue(1);
      prisma.talentProfile.create
        .mockRejectedValueOnce(
          // Shape produced by Prisma 7 with the pg driver adapter: index name in the message, no target.
          new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed on the constraint: `TalentProfile_slug_key`',
            { code: 'P2002', clientVersion: 'test', meta: {} },
          ),
        )
        .mockResolvedValueOnce(row({ slug: 'anna-petrova-ab12' }));

      await service.createMine(USER_ID, input);

      const slugs = (prisma.talentProfile.create.mock.calls as unknown[][]).map(
        (call) => (call[0] as { data: { slug: string } }).data.slug,
      );
      expect(slugs[0]).toBe('anna-petrova');
      expect(slugs[1]).toMatch(/^anna-petrova-[0-9a-f]{4}$/);
    });

    it('maps a unique violation on another index (double submit) to CONFLICT', async () => {
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'A',
        roles: [],
        talentProfile: null,
      });
      prisma.skill.count.mockResolvedValue(1);
      prisma.talentProfile.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the constraint: `TalentProfile_userId_key`',
          { code: 'P2002', clientVersion: 'test', meta: {} },
        ),
      );
      await expect(service.createMine(USER_ID, input)).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('fails validation on an unknown skill id', async () => {
      prisma.user.findUnique.mockResolvedValue({
        displayName: 'A',
        roles: [],
        talentProfile: null,
      });
      prisma.skill.count.mockResolvedValue(0);
      await expect(service.createMine(USER_ID, input)).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
    });
  });

  describe('updateMine', () => {
    it('sets publishedAt on first publication and replaces lists inside the transaction', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue({ id: PROFILE_ID, publishedAt: null });
      prisma.skill.count.mockResolvedValue(1);
      prisma.talentProfile.update.mockResolvedValue(
        row({ status: 'PUBLISHED', publishedAt: new Date() }),
      );

      await service.updateMine(USER_ID, { status: 'PUBLISHED', skillIds: [SKILL_ID] });

      expect(prisma.talentSkill.deleteMany).toHaveBeenCalledWith({
        where: { profileId: PROFILE_ID },
      });
      expect(prisma.talentLanguage.deleteMany).not.toHaveBeenCalled();
      const data = (firstCallArg(prisma.talentProfile.update) as { data: unknown }).data as {
        status: string;
        publishedAt: Date;
      };
      expect(data.status).toBe('PUBLISHED');
      expect(data.publishedAt).toBeInstanceOf(Date);
    });

    it('is NOT_FOUND when the user has no profile', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      await expect(service.updateMine(USER_ID, { headline: 'New' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });
});
