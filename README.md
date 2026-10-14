# SkillBoard Korea

Reverse job marketplace for foreigners in South Korea: talent post themselves, clients find them.
Architecture and decisions: [`docs/architecture.md`](docs/architecture.md), [`docs/decisions/`](docs/decisions/).
Agent rules arrive in Phase C (`CLAUDE.md`, `AGENTS.md`).

## Run it

```bash
pnpm install            # Node >= 24, pnpm 12 (version pinned in package.json)
pnpm db:up              # Postgres 17 + S3-compatible storage in Docker
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm dev                # api http://localhost:3001/v1  docs http://localhost:3001/docs  web http://localhost:3000
```

## Check it

```bash
pnpm check              # typecheck + lint + unit tests + prettier, whole monorepo (what CI runs)
pnpm test:e2e           # API e2e (needs Docker) + Playwright in phone and desktop viewports
pnpm api-client:generate# regenerate apps/api/openapi.json and packages/api-client after an API change
pnpm db:reset           # drop, migrate, seed the local database
```

## Layout

| Path                  | What                                                          |
| --------------------- | ------------------------------------------------------------- |
| `apps/web`            | Next.js 16 App Router, next-intl (en/ko/ru), Tailwind v4, PWA |
| `apps/api`            | Nest.js 11, Prisma 7, nestjs-zod, OpenAPI at `/docs`          |
| `packages/shared`     | Zod schemas, types, constants. Pure TS: no Node, no DOM       |
| `packages/api-client` | `openapi-fetch` client typed from `apps/api/openapi.json`     |
| `packages/config`     | tsconfig, ESLint, Prettier presets                            |
| `docs/`               | architecture, domain model, ADRs, specs (Phase E), tech debt  |
