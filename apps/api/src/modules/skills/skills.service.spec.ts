import { Test } from '@nestjs/testing';
import { SkillCatalogSchema } from '@skillboard/shared';
import { firstCallArg } from '../../../test/helpers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SkillsService } from './skills.service.js';

describe('SkillsService', () => {
  const prisma = { skillCategory: { findMany: jest.fn() } };
  let service: SkillsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SkillsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(SkillsService);
  });

  it('returns active categories with their skills in the shared shape', async () => {
    prisma.skillCategory.findMany.mockResolvedValue([
      {
        id: '019a0000-0000-7000-8000-000100000001',
        slug: 'tutoring',
        names: { en: 'Tutoring', ko: '과외', ru: 'Репетиторство' },
        skills: [
          {
            id: '019a0000-0000-7000-8000-000200000001',
            slug: 'russian-tutor',
            names: { en: 'Russian tutor' },
          },
        ],
      },
    ]);
    const catalog = await service.catalog();
    expect(SkillCatalogSchema.safeParse(catalog).success).toBe(true);
    expect(catalog.categories[0]?.skills[0]?.slug).toBe('russian-tutor');
    expect(firstCallArg(prisma.skillCategory.findMany)).toMatchObject({
      where: { isActive: true },
    });
  });

  it('fails loudly on malformed names JSON', async () => {
    prisma.skillCategory.findMany.mockResolvedValue([
      { id: '019a0000-0000-7000-8000-000100000001', slug: 'x', names: { ko: 'only' }, skills: [] },
    ]);
    await expect(service.catalog()).rejects.toThrow();
  });
});
