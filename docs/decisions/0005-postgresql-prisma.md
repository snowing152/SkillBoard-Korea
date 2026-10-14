# 0005. PostgreSQL with Prisma 7

Date: 2026-10-14 · Status: Accepted

## Context
One readable schema file is the best "domain doc" an agent can have. Free managed Postgres exists.

## Decision
Prisma 7 in `apps/api`: `prisma/schema.prisma` has `datasource db { provider = "postgresql" }` only;
`DATABASE_URL` lives in `apps/api/prisma.config.ts` via `defineConfig` + `env()`. Generator is
`provider = "prisma-client"` with `output = "../src/generated/prisma"` (git-ignored, regenerated on install).
Runtime uses the driver adapter: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
Migrations are committed (`prisma migrate dev` locally, `prisma migrate deploy` in CI/hosting).
A `PrismaService` in `src/common/prisma/` is the single client instance.

## Consequences
Agents trained on Prisma 5/6 will try to put `url` in the schema or use `prisma-client-js`; the path-scoped
rule `.claude/rules/prisma.md` says not to. Generated client is never committed or edited.
