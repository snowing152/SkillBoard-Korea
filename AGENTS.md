# SkillBoard Korea: rules for every coding agent

Reverse job marketplace for foreigners in South Korea: talent post themselves (skills, portfolio, video
link); clients (companies **or private individuals**) search and contact them. One mobile-first website
(PWA), UI in en/ko/ru. Monorepo: Next.js 16 (`apps/web`), Nest.js 11 (`apps/api`), Prisma 7 + PostgreSQL,
Zod 4 contracts in `packages/shared`. A React Native app comes later on the same API. The owner is a
student: explain _why_ in docs and comments.

## Commands (always from the repo root)

| Command                                                  | What                                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                             | typecheck + lint + unit tests + prettier, whole monorepo. **CI runs exactly this. Run it before "done".** |
| `pnpm dev`                                               | API http://localhost:3001/v1 (OpenAPI at `/docs`), web http://localhost:3000                              |
| `pnpm db:up` / `pnpm db:down`                            | Postgres 17 + RustFS (S3) in Docker                                                                       |
| `pnpm --filter @skillboard/api db:migrate --name <name>` | create + apply a migration on the local DB                                                                |
| `pnpm --filter @skillboard/api db:generate`              | regenerate the Prisma client after a schema change                                                        |
| `pnpm api-client:generate`                               | regenerate `apps/api/openapi.json` + `packages/api-client` after any API change (CI fails if stale)       |
| `pnpm test:e2e`                                          | API e2e (needs Docker) + Playwright in phone and desktop viewports                                        |
| `pnpm format`                                            | prettier --write                                                                                          |
| `pnpm db:reset`                                          | **humans only.** Prisma refuses it for AI agents; ask the owner for a clean database                      |

## Golden rules

1. One feature = one spec (`docs/specs/<slug>.md`) = one branch (`feat/<slug>`) = one PR that passes `pnpm check`.
2. Every API input and output is a Zod schema in `packages/shared`. Never hand-write API types. DTOs are
   one-liners: `class XDto extends createZodDto(XSchema) {}`.
3. No business logic in controllers or React components. API: services. Web: Server Components fetch via
   `@skillboard/api-client`; components render; pure logic in `lib/`.
4. No `any`. No disabled lint rule without a comment explaining why.
5. Every user-visible string goes through next-intl (`apps/web/messages/<locale>/<ns>.json`), all three
   locales in the same PR. No hard-coded UI text.
6. Mobile-first: build and check every page at 390 px first, then desktop. Playwright runs both.
7. Never commit secrets. Config only through validated env (`apps/api/src/common/config/env.ts`,
   `apps/web/src/env.ts`). Agents never read or write `.env*` files; change `.env.example` and ask.
8. Changing an architectural rule = update the matching ADR or doc in the same PR. Accepted ADR decisions
   are never edited; a new ADR supersedes them.
9. API conventions (ADR 0017): UUID v7 ids, UTC timestamps displayed in Asia/Seoul, errors
   `{ error: { code, message, details? }, requestId }`, cursor pagination `{ items, nextCursor }`.
10. Boundaries (ESLint-enforced): web imports `packages/*` only; api imports `packages/shared` only;
    shared imports only `zod` (no Node, DOM, React).
11. Minimal personal data (PIPA, ADR 0018). Logs never contain emails, tokens or request bodies.
12. Docs stay short. Every doc is read by agents on every related task; a long doc costs tokens forever.

## Never (hooks block these)

`rm -rf` outside build output · `git push --force` · `git reset --hard` / `git clean` · `pnpm db:reset` /
`prisma migrate reset` · editing `.env*`, `apps/api/src/generated/`, `apps/api/openapi.json`,
`packages/api-client/src/schema.ts`, `pnpm-lock.yaml` by hand · deploys and publishes · `sudo`.

## Where things are

| Need                                | Look at                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Big picture, verified library facts | `docs/architecture.md`                                                                                                                                                                                                                            |
| Entities, visibility rules, Prisma  | `docs/domain.md`                                                                                                                                                                                                                                  |
| Why a decision was made             | `docs/decisions/` (index in its README)                                                                                                                                                                                                           |
| Feature specs                       | `docs/specs/` (template `_template.md`)                                                                                                                                                                                                           |
| Style rules a linter cannot check   | `docs/conventions.md`                                                                                                                                                                                                                             |
| Known traps, deliberate shortcuts   | `docs/pitfalls.md`, `docs/tech-debt.md`                                                                                                                                                                                                           |
| Which model for which task          | `docs/ai/model-routing.md`                                                                                                                                                                                                                        |
| Design hand-off                     | `docs/design/README.md`                                                                                                                                                                                                                           |
| Rules for one part                  | `apps/web/CLAUDE.md`, `apps/api/CLAUDE.md`, `packages/shared/CLAUDE.md`                                                                                                                                                                           |
| **Reference feature to copy**       | `docs/specs/talent-profiles.md` → `packages/shared/src/talent-profiles/`, `apps/api/src/modules/talent-profiles/`, `apps/web/src/components/talent-profile/` and the pages under `apps/web/src/app/[locale]/`. `health` stays the minimal module. |

## Workflow for a feature

1. Read the spec. If anything is unclear, stop and ask; never guess product behaviour.
2. `git switch -c feat/<slug>` from an up-to-date `main`.
3. Build in this order: shared schema → Prisma model + migration → Nest module (service + spec,
   dto, controller) → `pnpm api-client:generate` → web page and components → messages en/ko/ru →
   tests the spec names (unit; Playwright only for named flows).
4. `pnpm check` green. Commit in small steps (`docs/conventions.md`). Open a PR with the template.
5. After a non-trivial bug fix: regression test, and one line in `docs/pitfalls.md` if the lesson is general.

## Done means

`pnpm check` passes · every acceptance criterion met · three locales · phone width checked · no `TODO`
without an issue number · generated files committed · docs/ADR updated when a rule changed.
