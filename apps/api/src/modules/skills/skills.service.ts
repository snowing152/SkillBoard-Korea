import { Injectable } from '@nestjs/common';
import { LocalizedNamesSchema, type SkillCatalog } from '@skillboard/shared';
import { PrismaService } from '../../common/prisma/prisma.service.js';

/**
 * Skills are data, not enums (docs/domain.md): adding "IT" is an insert in the seed or by an admin.
 * Read-only in MVP; the catalog is small, so one query and no pagination.
 */
@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async catalog(): Promise<SkillCatalog> {
    const categories = await this.prisma.skillCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        names: true,
        skills: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, slug: true, names: true },
        },
      },
    });
    return {
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        // `names` is a Json column; parsing it here turns bad seed data into a loud 500, not a silent blank.
        names: LocalizedNamesSchema.parse(c.names),
        skills: c.skills.map((s) => ({
          id: s.id,
          slug: s.slug,
          names: LocalizedNamesSchema.parse(s.names),
        })),
      })),
    };
  }
}
