# Project status

Current snapshot for humans and agents. Updated in every PR (`AGENTS.md`, skill `/update-status`).
Keep it under 150 lines; details live in the doc each line points to. Last updated: 2026-10-21.

## Product

- SkillBoard Korea is a reverse job marketplace: foreigners in South Korea post themselves (skills,
  portfolio, video link); clients search and contact them.
- Clients are companies **or private individuals**; talent and clients both need an account.
- Niche: foreigners in Korea (the supply side); contact is revealed to verified clients only.
- Languages: en, ko, ru (next-intl). Platform: one mobile-first website (PWA); React Native app later.
- Not in MVP (`docs/roadmap.md`): photo upload, email notifications, in-app chat, reviews, mobile app,
  monetization, better search, more login providers.

## Stack

- `apps/web`: Next.js 16 App Router, next-intl, Tailwind 4 + shadcn/ui (design system M4, ADR 0023), PWA.
- `apps/api`: Nest.js 11, Prisma 7 + PostgreSQL 17, Passport (Google + local), argon2id, REST + OpenAPI.
- `packages/shared`: Zod 4 schemas and constants, the single contract (pure TS).
- `packages/api-client`: typed fetch client generated from `apps/api/openapi.json`.
- `packages/config`: shared tsconfig and ESLint presets.
- Infra: Vercel (web), Render (API), Supabase Seoul (DB), Resend (mail), R2 (photos, later); Docker
  Compose locally (Postgres + RustFS). Free tiers only (ADR 0013, 0021).

## Harness

- Hooks (`.claude/hooks/`): `guard-bash`, `guard-edit` block destructive commands and protected files;
  `format-lint` runs Prettier + ESLint on edits; `stop-check` runs `pnpm check` before stopping;
  `session-start` prints branch and active spec.
- Skills: `/spec`, `/implement`, `/new-module`, `/add-language`, `/review`, `/update-status`.
- Subagents: `reviewer` (Sonnet, read-only), `test-writer` (Sonnet), `i18n-checker` (Haiku, read-only).
- Commands: `pnpm check` (typecheck + lint + tests + prettier), `pnpm check:ci` (clean env, CI parity),
  `pnpm test:e2e`, `pnpm api-client:generate`.
- CI (`.github/workflows/ci.yml`): `pnpm check`, build, generated files fresh, API e2e, Playwright in
  phone and desktop viewports.
- Branches: one spec = one branch `feat/<slug>` = one PR from an up-to-date `main`. `main` has no GitHub
  branch protection; the rule is "PR with green CI", one PR per spec, merged after green CI.
- Model routing: `docs/ai/model-routing.md`.

## Done

- #1 docs: Phase E specs, roadmap, ADRs 0020-0022.
- #2 chore: moderation reasons, purge job risk, scoped turbo env.
- #3 feat: legal pages and versioned consent (`legal`).
- #4 chore: skills accept slug or path, `pnpm check:ci`.
- #5 chore: ignore design reference exports.
- #6 feat(web): M4 design system foundation and restyled pages (ADR 0023).
- #7 feat: accounts, refresh tokens, Google sign-in (`accounts`, ADR 0024, 0025).
- #8 docs: project status snapshot and `/update-status` skill.
- #9 chore: exact package names in `pnpm --filter` permission rules (no `*` in option values).
- Before the PRs (direct commits): Phases A-D, `talent-profiles` (the reference feature).

## In progress

- Open PRs: #9 (`chore/exact-filter-permissions`) until merged. Extra branches: none.

## Next

Remaining MVP specs, in order (`docs/roadmap.md`), all Status: Ready:

1. `search` (`docs/specs/search.md`)
2. `contact-reveal`
3. `moderation`
4. `account-deletion`
5. Fix the two auth launch blockers (see below).
6. Launch: the checklist below.

Roadmap item 7, the Opus design pass, is partly done by M4 (#6); re-check it after the last page lands.

## Key decisions

- 0002 pnpm + Turborepo monorepo · 0004 Nest.js as a separate API · 0006 Zod in `packages/shared` is the
  contract · 0014 REST + OpenAPI generated from Zod.
- 0009 Passport (Google + local), argon2id, access + refresh tokens · 0019 own access-token guard, web
  session cookie · 0020 refresh tokens in the body, silent refresh in the proxy.
- 0024 rotation vs revocation, bound Google state, Google role step · 0025 one refresh successor, Google
  linking ends the old password.
- 0013 free-tier hosting · 0021 Supabase free in Seoul (supersedes the DB row of 0013).
- 0015 chat is an isolated module later · 0016 data model keeps monetization open.
- 0017 API conventions (UUID v7, UTC, error shape, cursor paging) · 0018 PIPA, minimal personal data ·
  0022 account deletion: 14-day grace, blocked-email hash.
- 0007 / 0023 shadcn/ui + design system M4 · 0008 next-intl with en/ko/ru.

## Launch blockers and checklist

Code blockers (`docs/tech-debt.md`):

- Auth rate limits see the Next server's IP, not the client's (no `trust proxy`, no forwarded IP).
- The Google `signup` token and exchange `code` are bearer values; bind them to the browser (PKCE-style).
- No API Dockerfile yet.

Owner checklist (`docs/roadmap.md`):

- Create the Google OAuth client, Resend domain, Supabase DB (Seoul), Render service, Vercel project; fill
  env from `.env.example` on each host.
- Lawyer review of the legal drafts (AI-written, ko/ru unreviewed); name a privacy officer; bump
  `LEGAL_VERSIONS` when texts change.
- Legal review of the 14-day deletion grace and 1-year blocked-email retention (ADR 0022).
- Grant the first `ADMIN` by SQL; set the real `SUPPORT_EMAIL` (now `support@skillboard.local`).
- Add repo secrets `API_URL` and `JOB_SECRET` for the daily purge workflow (it also keeps Supabase and
  Render awake; GitHub pauses schedules after 60 idle days).
- Re-check free-tier limits and the Vercel Hobby non-commercial clause before any revenue.

## Lessons learned

- `pnpm check` can pass locally while CI fails on env vars: run `pnpm check:ci` after touching
  `turbo.json`, `package.json`, workflows or env.
- A global `JwtAuthGuard` made `/v1/health` private; only the e2e test noticed. Test public routes.
- Refresh tokens: revoked-on-purpose and rotated tokens must be told apart, or a password change looks
  like a replay and signs out every session.
- A dummy hash built from a string in the source signed in to every Google-only account.
- Parallel Playwright viewports collide on shared data (same user name, one IP, API rate limit).
- Server Actions cannot call `getLocale()`; layouts cannot read the URL.
- `<Button render={<Link />}>` loses link semantics; `cn` drops unknown `text-*` classes.
- Password-shaped literals in tests trip secret scanners on every commit of a PR.
- `guard-bash` matches command text, heredocs included; do not mention forbidden commands in messages.
- Pinned ESM-only packages (`@nestjs/jwt@12`) break Jest; see `docs/tech-debt.md`.

## Budget

- API credits: about $39 left of $100. Keep them for the final security review, chat design and hard
  bugs. Daily work runs on the Claude subscription.
