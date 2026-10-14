---
paths:
  - 'apps/api/prisma/**'
  - 'apps/api/prisma.config.ts'
---

# Prisma rules (Prisma 7)

- Verified facts, do not "fix" them: `datasource db { provider = "postgresql" }` only; the URL lives in
  `prisma.config.ts`; generator `provider = "prisma-client"` with `output = "../src/generated/prisma"` and
  `moduleFormat = "cjs"`; runtime uses the `PrismaPg` adapter (`docs/architecture.md`, library table).
- Models follow the draft in `docs/domain.md`: `@id @default(uuid(7)) @db.Uuid`, `createdAt @default(now())`,
  `updatedAt @updatedAt`. Personal-data relations `onDelete: Cascade` from `User`; audit rows
  (`Report`, `ModerationAction`, `ContactReveal`) use `onDelete: SetNull` (ADR 0018).
- Enums only for sets the code reasons about (`ProfileStatus`, `WorkMode`). Content sets are tables
  (`Skill`, `SkillCategory`) with `names Json` = `{ en, ko, ru }`.
- Index every column a search filter uses; the composite for the "publicly visible" predicate comes first.
- Workflow: edit `schema.prisma` → `pnpm --filter @skillboard/api db:migrate --name <snake_case>` (needs
  `pnpm db:up`) → commit `prisma/migrations/**`. Never edit an applied migration; add a new one. Never
  touch `src/generated/`.
- `pnpm db:reset` is human-only (Prisma refuses AI agents). Need a clean DB? Ask the owner.
- `prisma/seed.ts` is deterministic (fixed ids, seeded faker) because e2e tests rely on it. Extend it when
  you add a table; keep the launch-niche data (tutors, SMM, translators; Seoul/Busan/Incheon/Daegu;
  ru/en/ko/uz speakers; mixed visa types).
