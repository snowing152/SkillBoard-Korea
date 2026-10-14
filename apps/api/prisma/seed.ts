/**
 * Seed for local development, API e2e and Playwright (ADR 0011). Runs via `pnpm --filter @skillboard/api
 * db:seed` (humans: `pnpm db:reset`). Deterministic on purpose: fixed ids, a tiny seeded PRNG and no faker,
 * so tests can rely on `talent01@skillboard.local` always being the same person.
 * Data is the launch niche: tutors, SMM, translators across Seoul/Busan/Incheon/Daegu, ru/en/ko/uz speakers.
 */
/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { argon2id, hash } from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type { ContactType, LanguageLevel, WorkMode } from '../src/generated/prisma/enums.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is required to seed');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

/** Every seed user signs in with this password. */
export const SEED_PASSWORD = 'Password123!';
export const SEED_EMAIL_DOMAIN = 'skillboard.local';

/** Valid UUID v7-shaped ids built from a kind and a number, so they are stable across runs. */
function fixedId(kind: number, n: number): string {
  return `019a0000-0000-7000-8000-${String(kind).padStart(4, '0')}${String(n).padStart(8, '0')}`;
}
const ID = {
  category: (n: number) => fixedId(1, n),
  skill: (n: number) => fixedId(2, n),
  user: (n: number) => fixedId(3, n),
  profile: (n: number) => fixedId(4, n),
  link: (n: number) => fixedId(5, n),
  contact: (n: number) => fixedId(6, n),
  report: (n: number) => fixedId(7, n),
  moderation: (n: number) => fixedId(8, n),
};

/** mulberry32: small, seeded, good enough to pick array items deterministically. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = prng(20261014);
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

const categories = [
  { n: 1, slug: 'tutoring', names: { en: 'Tutoring', ko: '과외', ru: 'Репетиторство' } },
  { n: 2, slug: 'marketing', names: { en: 'Marketing', ko: '마케팅', ru: 'Маркетинг' } },
  {
    n: 3,
    slug: 'creative',
    names: { en: 'Content & video', ko: '콘텐츠·영상', ru: 'Контент и видео' },
  },
  {
    n: 4,
    slug: 'language-services',
    names: { en: 'Translation & interpreting', ko: '번역·통역', ru: 'Перевод' },
  },
];

const skills = [
  {
    n: 1,
    c: 1,
    slug: 'russian-tutor',
    names: { en: 'Russian tutor', ko: '러시아어 과외', ru: 'Репетитор русского' },
  },
  {
    n: 2,
    c: 1,
    slug: 'english-tutor',
    names: { en: 'English tutor', ko: '영어 과외', ru: 'Репетитор английского' },
  },
  {
    n: 3,
    c: 1,
    slug: 'korean-tutor',
    names: { en: 'Korean tutor', ko: '한국어 과외', ru: 'Репетитор корейского' },
  },
  {
    n: 4,
    c: 1,
    slug: 'kids-tutor',
    names: { en: 'Tutor for children', ko: '어린이 과외', ru: 'Репетитор для детей' },
  },
  {
    n: 5,
    c: 1,
    slug: 'math-tutor',
    names: { en: 'Math tutor', ko: '수학 과외', ru: 'Репетитор математики' },
  },
  { n: 6, c: 2, slug: 'smm', names: { en: 'SMM manager', ko: 'SNS 마케팅', ru: 'SMM-менеджер' } },
  {
    n: 7,
    c: 2,
    slug: 'content-marketing',
    names: { en: 'Content marketing', ko: '콘텐츠 마케팅', ru: 'Контент-маркетинг' },
  },
  {
    n: 8,
    c: 2,
    slug: 'ads-management',
    names: { en: 'Ads management', ko: '광고 운영', ru: 'Настройка рекламы' },
  },
  {
    n: 9,
    c: 3,
    slug: 'video-editing',
    names: { en: 'Video editing', ko: '영상 편집', ru: 'Монтаж видео' },
  },
  {
    n: 10,
    c: 3,
    slug: 'videography',
    names: { en: 'Videography', ko: '영상 촬영', ru: 'Видеосъёмка' },
  },
  {
    n: 11,
    c: 3,
    slug: 'photography',
    names: { en: 'Photography', ko: '사진 촬영', ru: 'Фотосъёмка' },
  },
  {
    n: 12,
    c: 3,
    slug: 'graphic-design',
    names: { en: 'Graphic design', ko: '그래픽 디자인', ru: 'Графический дизайн' },
  },
  {
    n: 13,
    c: 4,
    slug: 'translator-ru-ko',
    names: { en: 'Translator RU–KO', ko: '러-한 번역', ru: 'Переводчик RU–KO' },
  },
  {
    n: 14,
    c: 4,
    slug: 'translator-en-ko',
    names: { en: 'Translator EN–KO', ko: '영-한 번역', ru: 'Переводчик EN–KO' },
  },
  {
    n: 15,
    c: 4,
    slug: 'interpreter',
    names: { en: 'Interpreter', ko: '통역', ru: 'Устный переводчик' },
  },
  {
    n: 16,
    c: 4,
    slug: 'copywriting',
    names: { en: 'Copywriting', ko: '카피라이팅', ru: 'Копирайтинг' },
  },
];

const talentNames = [
  'Anna Petrova',
  'Dmitry Sokolov',
  'Aziza Karimova',
  'Michael Lee',
  'Olga Ivanova',
  'Timur Rakhimov',
  'Sarah Johnson',
  'Elena Kim',
  'Bekzod Yusupov',
  'Maria Garcia',
  'Ivan Smirnov',
  'Nilufar Tosheva',
  'David Park',
  'Ekaterina Volkova',
  'Jasur Alimov',
  'Emily Brown',
  'Natalia Orlova',
  'Sherzod Nazarov',
  'Daniel Wilson',
  'Kseniya Morozova',
] as const;

const headlines = [
  'Russian tutor for kids and adults',
  'English conversation tutor, TOEIC prep',
  'SMM manager for cafes and small brands',
  'Video editor for YouTube and Reels',
  'Translator and interpreter RU–KO–EN',
  'Korean tutor for Russian speakers',
  'Content creator and short-form video',
  'Math and physics tutor, school level',
] as const;

const cities = ['SEOUL', 'SEOUL', 'SEOUL', 'BUSAN', 'INCHEON', 'DAEGU', 'GYEONGGI'] as const;
const visas = [
  'F-2',
  'F-4',
  'F-5',
  'F-6',
  'E-7',
  'D-10',
  'D-2',
  'H-1',
  'OTHER',
  'UNDISCLOSED',
] as const;
const workModes: readonly WorkMode[] = ['REMOTE', 'ON_SITE', 'HYBRID'];
const levels: readonly LanguageLevel[] = ['NATIVE', 'FLUENT', 'INTERMEDIATE', 'BASIC'];
const languageSets = [
  ['ru', 'en', 'ko'],
  ['ru', 'ko'],
  ['en', 'ko'],
  ['uz', 'ru', 'ko'],
  ['uz', 'ru', 'en'],
  ['en'],
] as const;
const contactTypes: readonly ContactType[] = ['EMAIL', 'TELEGRAM', 'KAKAO'];

async function main(): Promise<void> {
  const passwordHash = await hash(SEED_PASSWORD, { type: argon2id });

  // Wipe in dependency order (cascades do most of it), then recreate. Dev and test databases only.
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();

  await prisma.skillCategory.createMany({
    data: categories.map((c) => ({
      id: ID.category(c.n),
      slug: c.slug,
      names: c.names,
      sortOrder: c.n,
    })),
  });
  await prisma.skill.createMany({
    data: skills.map((s) => ({
      id: ID.skill(s.n),
      slug: s.slug,
      names: s.names,
      categoryId: ID.category(s.c),
      sortOrder: s.n,
    })),
  });

  await prisma.user.createMany({
    data: [
      {
        id: ID.user(1),
        email: `admin@${SEED_EMAIL_DOMAIN}`,
        displayName: 'Site Admin',
        passwordHash,
        roles: ['ADMIN', 'CLIENT'],
        emailVerifiedAt: new Date('2026-10-01T00:00:00Z'),
      },
      {
        id: ID.user(2),
        email: `client@${SEED_EMAIL_DOMAIN}`,
        displayName: 'Minji Choi',
        passwordHash,
        roles: ['CLIENT'],
        locale: 'ko',
        emailVerifiedAt: new Date('2026-10-01T00:00:00Z'),
      },
    ],
  });

  let linkN = 0;
  let contactN = 0;
  for (let i = 1; i <= talentNames.length; i += 1) {
    const userId = ID.user(100 + i);
    const profileId = ID.profile(i);
    const name = talentNames[i - 1] as string;
    const isDraft = i === 19;
    const isHidden = i === 20;
    const publishedAt = isDraft ? null : new Date(Date.UTC(2026, 9, 1 + i, 9, 0, 0));
    const langs = pick(languageSets);
    const skillCount = 1 + Math.floor(random() * 3);
    const skillIds = new Set<string>();
    while (skillIds.size < skillCount)
      skillIds.add(ID.skill(1 + Math.floor(random() * skills.length)));

    await prisma.user.create({
      data: {
        id: userId,
        email: `talent${String(i).padStart(2, '0')}@${SEED_EMAIL_DOMAIN}`,
        displayName: name,
        passwordHash,
        roles: ['TALENT'],
        locale: langs[0] === 'uz' ? 'ru' : langs[0],
        emailVerifiedAt: new Date('2026-10-01T00:00:00Z'),
        talentProfile: {
          create: {
            id: profileId,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            headline: pick(headlines),
            description: `${name} has been working with foreigners and locals in Korea for several years. Lessons and projects are available online and in person; first consultation is free. Seed data for local development.`,
            videoUrl: i % 3 === 0 ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : null,
            cityCode: pick(cities),
            workMode: pick(workModes),
            visaType: pick(visas),
            status: isDraft ? 'DRAFT' : 'PUBLISHED',
            publishedAt,
            hiddenAt: isHidden ? new Date('2026-10-13T12:00:00Z') : null,
            hiddenReason: isHidden ? 'Seed: hidden by admin for the moderation example' : null,
            skills: {
              create: [...skillIds].map((skillId, order) => ({ skillId, sortOrder: order })),
            },
            languages: {
              create: langs.map((languageCode, order) => ({
                languageCode,
                level: order === 0 ? 'NATIVE' : pick(levels.slice(1)),
              })),
            },
            portfolioLinks: {
              create:
                i % 2 === 0
                  ? [
                      {
                        id: ID.link(++linkN),
                        url: 'https://github.com/example',
                        label: 'GitHub',
                        sortOrder: 0,
                      },
                    ]
                  : [],
            },
            contactMethods: {
              create: [
                {
                  id: ID.contact(++contactN),
                  type: 'EMAIL',
                  value: `talent${i}@${SEED_EMAIL_DOMAIN}`,
                },
                ...(i % 2 === 0
                  ? [
                      {
                        id: ID.contact(++contactN),
                        type: pick(contactTypes.slice(1)),
                        value: `@talent${i}`,
                      },
                    ]
                  : []),
              ],
            },
          },
        },
      },
    });
  }

  // Moderation examples for the reports/moderation spec: two open reports, one hide action.
  await prisma.report.createMany({
    data: [
      {
        id: ID.report(1),
        profileId: ID.profile(3),
        reporterUserId: ID.user(2),
        reason: 'SPAM',
        details: 'Seed: profile text looks copied from an ad.',
      },
      {
        id: ID.report(2),
        profileId: ID.profile(20),
        reporterUserId: ID.user(2),
        reason: 'SCAM',
        details: 'Seed: asked for payment up front and disappeared.',
      },
    ],
  });
  await prisma.moderationAction.create({
    data: {
      id: ID.moderation(1),
      profileId: ID.profile(20),
      adminUserId: ID.user(1),
      action: 'HIDE',
      reason: 'Seed: hidden after a scam report',
    },
  });

  console.log(
    `[seed] ${categories.length} categories, ${skills.length} skills, ${talentNames.length + 2} users. ` +
      `Sign in as talent01@${SEED_EMAIL_DOMAIN} / ${SEED_PASSWORD}`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
