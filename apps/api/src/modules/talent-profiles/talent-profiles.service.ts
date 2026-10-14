import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  CityCodeSchema,
  DEFAULT_LOCALE,
  type CreateTalentProfile,
  LanguageCodeSchema,
  LocaleSchema,
  LocalizedNamesSchema,
  type MyTalentProfile,
  type Paginated,
  slugify,
  type TalentCard,
  type TalentProfile,
  type TalentProfileQuery,
  type UpdateTalentProfile,
  VisaTypeSchema,
} from '@skillboard/shared';
import { ApiError } from '../../common/errors/api-error.js';
import { decodeCursor, encodeCursor } from '../../common/pagination/cursor.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ConsentsService } from '../consents/consents.service.js';

/**
 * One `select` for every read, so the mappers below always get the same row shape and a new column
 * is added in exactly one place. Contact methods are selected too, but only `toMine()` exposes them.
 */
const profileSelect = {
  id: true,
  slug: true,
  headline: true,
  description: true,
  photoUrl: true,
  videoUrl: true,
  cityCode: true,
  workMode: true,
  visaType: true,
  status: true,
  publishedAt: true,
  hiddenAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { displayName: true } },
  skills: {
    orderBy: { sortOrder: 'asc' },
    select: { skill: { select: { id: true, slug: true, names: true } } },
  },
  languages: { select: { languageCode: true, level: true } },
  portfolioLinks: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, label: true } },
  contactMethods: { select: { id: true, type: true, value: true } },
} satisfies Prisma.TalentProfileSelect;
type ProfileRow = Prisma.TalentProfileGetPayload<{ select: typeof profileSelect }>;

/** The visibility rule from docs/domain.md, written once. */
const PUBLICLY_VISIBLE = {
  status: 'PUBLISHED',
  hiddenAt: null,
} satisfies Prisma.TalentProfileWhereInput;

const SLUG_ATTEMPTS = 5;

@Injectable()
export class TalentProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consents: ConsentsService,
  ) {}

  /** Public list, newest first. The search spec adds filters and ranking on top of this query. */
  async listPublic(query: TalentProfileQuery): Promise<Paginated<TalentCard>> {
    const cursorId = decodeCursor(query.cursor);
    // Fetch one extra row to know whether a next page exists without a COUNT (ADR 0017).
    const rows = await this.prisma.talentProfile.findMany({
      where: { ...PUBLICLY_VISIBLE, ...(cursorId ? { id: { lt: cursorId } } : {}) },
      orderBy: { id: 'desc' },
      take: query.limit + 1,
      select: profileSelect,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toCard),
      nextCursor: rows.length > query.limit && last ? encodeCursor(last.id) : null,
    };
  }

  async getPublicBySlug(slug: string): Promise<TalentProfile> {
    const row = await this.prisma.talentProfile.findFirst({
      where: { slug, ...PUBLICLY_VISIBLE },
      select: profileSelect,
    });
    // Same 404 for missing, draft and hidden: the public must not learn that a hidden profile exists.
    if (!row) throw new ApiError('NOT_FOUND', 'Profile not found');
    return toPublic(row);
  }

  async getMine(userId: string): Promise<MyTalentProfile> {
    const row = await this.prisma.talentProfile.findUnique({
      where: { userId },
      select: profileSelect,
    });
    if (!row) throw new ApiError('NOT_FOUND', 'You have no profile yet');
    return toMine(row);
  }

  async createMine(userId: string, input: CreateTalentProfile): Promise<MyTalentProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        roles: true,
        locale: true,
        talentProfile: { select: { id: true } },
      },
    });
    if (!user) throw new ApiError('UNAUTHENTICATED', 'Account no longer exists');
    if (user.talentProfile) throw new ApiError('CONFLICT', 'Profile already exists; use PATCH');
    await this.assertSkillsExist(input.skillIds);
    const base = slugify(user.displayName);

    // No "is the slug free?" pre-check: two sign-ups with the same display name can pass it at the same
    // moment and both insert the same slug (seen when the phone and desktop Playwright projects ran in
    // parallel). The unique index is the only reliable check; on a collision we retry with a suffix.
    for (let attempt = 0; ; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          // A CLIENT who creates a profile becomes a TALENT as well; one account, both sides (docs/domain.md).
          if (!user.roles.includes('TALENT')) {
            await tx.user.update({ where: { id: userId }, data: { roles: { push: 'TALENT' } } });
          }
          // The acknowledged disclaimer is stored as a Consent row in the same transaction; the flag
          // itself is not a column (legal spec). Language = the user's language setting.
          await this.consents.record(
            userId,
            ['VISA_DISCLAIMER'],
            LocaleSchema.catch(DEFAULT_LOCALE).parse(user.locale),
            tx,
          );
          return tx.talentProfile.create({
            data: {
              userId,
              slug,
              headline: input.headline,
              description: input.description,
              cityCode: input.cityCode,
              workMode: input.workMode,
              visaType: input.visaType,
              videoUrl: input.videoUrl,
              skills: { create: input.skillIds.map((skillId, i) => ({ skillId, sortOrder: i })) },
              languages: { create: input.languages },
              portfolioLinks: {
                create: input.portfolioLinks.map((l, i) => ({ ...l, sortOrder: i })),
              },
              contactMethods: { create: input.contactMethods },
            },
            select: profileSelect,
          });
        });
        return toMine(row);
      } catch (err: unknown) {
        if (isUniqueViolation(err, 'slug') && attempt < SLUG_ATTEMPTS) continue;
        // Any other unique violation here is the userId index: a double submit raced the pre-check.
        if (isUniqueViolation(err))
          throw new ApiError('CONFLICT', 'Profile already exists; use PATCH');
        throw err;
      }
    }
  }

  async updateMine(userId: string, input: UpdateTalentProfile): Promise<MyTalentProfile> {
    const existing = await this.prisma.talentProfile.findUnique({
      where: { userId },
      select: { id: true, publishedAt: true },
    });
    if (!existing) throw new ApiError('NOT_FOUND', 'You have no profile yet');
    if (input.skillIds) await this.assertSkillsExist(input.skillIds);

    const data: Prisma.TalentProfileUpdateInput = scalarData(input);
    if (input.status !== undefined) {
      data.status = input.status;
      // First publication sets publishedAt; re-publishing keeps the original date.
      if (input.status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date();
    }
    if (input.skillIds) {
      data.skills = { create: input.skillIds.map((skillId, i) => ({ skillId, sortOrder: i })) };
    }
    if (input.languages) data.languages = { create: input.languages };
    if (input.portfolioLinks) {
      data.portfolioLinks = {
        create: input.portfolioLinks.map((l, i) => ({ ...l, sortOrder: i })),
      };
    }
    if (input.contactMethods) data.contactMethods = { create: input.contactMethods };

    // Lists replace as a whole (spec): delete the old rows, then let the update create the new ones,
    // all in one transaction so a failed validation never leaves a half-updated profile.
    const profileId = existing.id;
    const row = await this.prisma.$transaction(async (tx) => {
      if (input.skillIds) await tx.talentSkill.deleteMany({ where: { profileId } });
      if (input.languages) await tx.talentLanguage.deleteMany({ where: { profileId } });
      if (input.portfolioLinks) await tx.portfolioLink.deleteMany({ where: { profileId } });
      if (input.contactMethods) await tx.contactMethod.deleteMany({ where: { profileId } });
      return tx.talentProfile.update({ where: { id: profileId }, data, select: profileSelect });
    });
    return toMine(row);
  }

  private async assertSkillsExist(skillIds: string[]): Promise<void> {
    const found = await this.prisma.skill.count({
      where: { id: { in: skillIds }, isActive: true },
    });
    if (found !== skillIds.length) {
      throw new ApiError('VALIDATION_FAILED', 'Unknown skill', [
        { path: ['skillIds'], message: 'One or more skills do not exist or are inactive' },
      ]);
    }
  }
}

/**
 * Prisma's unique-index error (P2002), optionally for one column. The classic engine reports
 * `meta.target = ['slug']`; Prisma 7 with a driver adapter reports only the index name in the message
 * (`TalentProfile_slug_key`), so both forms are checked.
 */
function isUniqueViolation(err: unknown, column?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false;
  if (column === undefined) return true;
  const target: unknown = err.meta?.target;
  if (Array.isArray(target)) return target.includes(column);
  return `${JSON.stringify(err.meta ?? {})} ${err.message}`.includes(`_${column}_key`);
}

/**
 * Scalar columns of a PATCH. Only keys that were sent are copied: with `exactOptionalPropertyTypes`
 * Prisma refuses `{ headline: undefined }`, and "absent" must stay different from "set to null".
 */
function scalarData(input: UpdateTalentProfile): Prisma.TalentProfileUpdateInput {
  const data: Prisma.TalentProfileUpdateInput = {};
  if (input.headline !== undefined) data.headline = input.headline;
  if (input.description !== undefined) data.description = input.description;
  if (input.cityCode !== undefined) data.cityCode = input.cityCode;
  if (input.workMode !== undefined) data.workMode = input.workMode;
  if (input.visaType !== undefined) data.visaType = input.visaType;
  if (input.videoUrl !== undefined) data.videoUrl = input.videoUrl;
  return data;
}

// cityCode, visaType and languageCode are plain text columns whose allowed values live in
// packages/shared (docs/domain.md). Parsing on the way out keeps the response type honest without a cast.
function toCard(row: ProfileRow): TalentCard {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.user.displayName,
    headline: row.headline,
    photoUrl: row.photoUrl,
    cityCode: CityCodeSchema.nullable().parse(row.cityCode),
    workMode: row.workMode,
    visaType: VisaTypeSchema.nullable().parse(row.visaType),
    skills: row.skills.map(({ skill }) => ({
      id: skill.id,
      slug: skill.slug,
      names: LocalizedNamesSchema.parse(skill.names),
    })),
    languages: row.languages.map((l) => ({
      languageCode: LanguageCodeSchema.parse(l.languageCode),
      level: l.level,
    })),
  };
}

function toPublic(row: ProfileRow): TalentProfile {
  return {
    ...toCard(row),
    description: row.description,
    videoUrl: row.videoUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    portfolioLinks: row.portfolioLinks,
  };
}

/** Owner view: the only mapper that exposes contact methods and moderation state. */
function toMine(row: ProfileRow): MyTalentProfile {
  return {
    ...toPublic(row),
    status: row.status,
    hiddenAt: row.hiddenAt?.toISOString() ?? null,
    contactMethods: row.contactMethods,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
