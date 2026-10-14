# Project Brief for the Architect Agent (Claude Fable 5.1)

> Put this file in the root of an empty git repository and start Claude Code with Fable.
> First message to the agent: "Read FABLE_BRIEF.md and start Phase A."

---

## 1. Your role

You are the **lead architect** of this project. Your job is NOT to build the whole product.
Your job is to build the **foundation**: the architecture, the AI-first development environment,
and one reference feature that every future agent will copy.

After you finish, cheaper models will do most of the work:
- **Claude Sonnet**: implements features from your specs.
- **Claude Opus**: owns visual design and UI quality.
- **Claude Haiku**: small chores (renames, translations of UI strings, simple tests).

Everything you produce must make **their** work easy, predictable, and hard to break.

---

## 2. Budget rules (very important)

The owner has **about $100 of API credit** for this whole phase. Output tokens are the most expensive part.

- **Write decisions, structure, configs, docs, and specs. Do not write bulk feature code.**
- Write exactly **one** complete reference feature (see Phase D). Sonnet will copy its pattern.
- **Stop at every checkpoint** (marked `CHECKPOINT`) and wait for the owner to approve before continuing.
- Prefer short, dense docs over long ones. A doc that is too long wastes tokens for every future agent that reads it.
- Do not re-read large files you already read in this session unless they changed.
- If a task looks bigger than expected, stop and tell the owner instead of pushing through.

---

## 3. The product

**Working name:** SkillBoard Korea (the owner may rename it later; keep the name in one config place).

**What it is:** a reverse job marketplace for **foreigners living in South Korea**.
Instead of companies posting vacancies, **people post themselves**: their skills, portfolio, and a short video.

**Two sides:**
- **Talent** (foreigners in Korea): video creators, marketers, developers, language tutors, etc.
- **Clients**: anyone who needs a person with a specific skill. Two equally important groups:
  - **Companies**: hiring staff or freelancers (for example, a startup looking for an SMM manager).
  - **Private individuals**: ordinary people with a personal need (for example, a parent looking for a Russian tutor for a child, or someone who needs a translator for a document or a video for a small event).
  The product, wording, and sign-up flow must not assume the client is a company. A private person must be able to sign up and contact talent without any company details.

**Competitors** (job boards where companies post jobs): Bjob Korea, Albadoo. Closest model globally: Fiverr / Kmong, but none focus on foreigners in Korea.

### Launch niche

The code stays generic (any skill), but the launch focuses on:
- **Tutors**: language tutors (Russian, English, Korean, etc.), including tutors for children.
- **Freelancers**: SMM, content and video creation, translators and interpreters, and similar creative / language services.

Use this niche for: the default skill categories, the seed data, the example content in specs, and the order of filters in search.
Skill categories must be **data (a table or config), not hard-coded enums**, so new categories (for example IT) can be added later without a migration of business logic.

### Platforms: phone and desktop

- MVP is **one responsive website, designed mobile-first**: every page must work well on a phone screen first, then scale up to desktop.
- Make the web app a **PWA** (installable to the home screen, app icon, basic offline page). This gives an "app on the phone" for free, without app stores.
- Later, a **native mobile app** will be built with **React Native + Expo** in `apps/mobile`, using the same Nest.js API and the same Zod schemas from `packages/shared`.
  Prepare for this now: keep `packages/shared` free of any web-only or Node-only code, and keep the typed API client in a package both web and mobile can import.

### MVP scope (build the foundation for this)

1. **Accounts**: sign in with **Google** or **email + password** (with email verification). A user chooses a role: Talent or Client (one account may later have both).
2. **Talent profile**: photo, headline, description, skills (tags), languages spoken, city, remote / on-site, **visa type (self-declared)**, video **as an external link** (YouTube etc.), portfolio links.
3. **Search**: filter by skill, language, city, remote / on-site, visa type. Paginated.
4. **Contact**: a "Contact" button that reveals the contact methods the talent chose to share (email, Telegram, KakaoTalk ID). No in-app chat in MVP.
5. **Moderation**: users can report a profile; an admin can hide a profile.
6. **Legal basics**: privacy policy page, consent checkbox at sign-up, a visa disclaimer (users are responsible for working within their visa rules; link to official HiKorea rules).

### Explicitly NOT in MVP (but the architecture must allow adding them without a rewrite)

- **In-app chat** (real-time, WebSocket).
- **Reviews and ratings.**
- **Mobile app** (iOS / Android) using the same API.
- **Monetization**: undecided. Could be company subscriptions, paid profile promotion, or commission. Do not build any of it, but do not design the data model in a way that blocks any of these.
- Verification of companies or talent (MVP uses reports + manual moderation only).
- Video upload (MVP uses external links only).

### Languages

- UI in **English, Korean, Russian**. English is the default.
- Adding a new language must be **one folder of translation files + one config line**. No code changes.
- User-written content (profile text) is stored as written; it is NOT translated by the system in MVP.

---

## 4. Fixed technical decisions

Do not re-debate these. Record each one briefly as an ADR in `docs/decisions/`.

| Area | Decision | Reason |
|---|---|---|
| Language | **TypeScript, strict mode** everywhere | Type errors are the cheapest feedback for agents |
| Repo | **Monorepo: pnpm workspaces + Turborepo** | Shared types, one CI, one place for agent rules |
| Frontend | **Next.js (App Router)** in `apps/web` | Industry standard, SSR for SEO of public profiles |
| Backend | **Nest.js** in `apps/api` | Strict module structure; a separate API is required for the future mobile app |
| Database | **PostgreSQL** + **Prisma** | Readable schema in one file |
| Validation / contracts | **Zod** schemas in `packages/shared` | One source of truth for front, back, and future mobile |
| UI kit | **Tailwind CSS + shadcn/ui** | Opus will design on top of it; components are owned in-repo |
| i18n | **next-intl** (frontend) | Simple file-based translations |
| Auth | Done in **Nest.js** (Passport: Google OAuth + local), passwords hashed with **argon2**, **access token + refresh token** | Must work for both web and a future mobile app |
| Tests | **Jest** (api), **Vitest** (web, shared), **Playwright** (a few end-to-end flows) | |
| Local dev | **Docker Compose** for PostgreSQL | An agent must be able to run the full app alone |
| CI | **GitHub Actions** | Typecheck, lint, test, build on every PR |

### Hosting constraint: free tiers only

The owner can pay **$0/month** after launch. Choose free-tier hosting and write an ADR with the trade-offs:
- Frontend: Vercel (free).
- Database: a free managed PostgreSQL (for example Neon or Supabase).
- API: a free-tier Node host. Note honestly in the ADR that free API hosts may **sleep** after inactivity, and what this means for the future real-time chat.
- Email: a provider with a free tier (for example Resend).
- Keep all hosting-specific code behind config / env variables so moving to paid hosting later is a config change, not a rewrite.

### Open decisions for you (write an ADR for each)

- API style details: REST + **OpenAPI generated from Nest** (so web and mobile get typed clients).
- How the future chat module will plug in (WebSocket gateway in Nest, separate module boundary).
- Data model choices that keep monetization open (for example: a `User` can own one `TalentProfile` and later one `Organization`; avoid putting payment fields on core tables).
- Error format, pagination format, ID format, timestamps / timezones (the users are in Korea: store UTC, display in KST by default).
- Security basics: rate limiting, CORS, input validation, secrets handling, personal data handling (Korean PIPA in mind: collect minimal data, allow account deletion).

---

## 5. The AI-first development environment (your main deliverable)

The core principle: **an agent is only as good as its context and its feedback loops.**

### 5.1 Context for agents

- `CLAUDE.md` in the root: what the project is (5 lines), the commands, the golden rules, where to find things. **Keep it under ~150 lines.**
- `apps/web/CLAUDE.md`, `apps/api/CLAUDE.md`, `packages/shared/CLAUDE.md`: rules only for that part.
- `docs/architecture.md`: one page, with a simple diagram (Mermaid).
- `docs/decisions/`: ADRs, short template (Context / Decision / Consequences).
- `docs/domain.md`: the main entities and their relations in plain words.
- `docs/specs/_template.md`: the feature spec template (Goal, User stories, API contract, Data changes, UI states, Acceptance criteria, Out of scope).
- `docs/specs/`: specs for every remaining MVP feature (accounts, search, contact, moderation, legal pages), written so that **Sonnet can implement them without asking questions**.
- `docs/ai/model-routing.md`: which model to use for which kind of task (Fable / Opus / Sonnet / Haiku), with examples.
- `docs/conventions.md`: only the style rules a linter **cannot** enforce (naming, folder layout, error handling, how to write commit messages and PR descriptions). Anything a tool can check goes into ESLint / Prettier / TS config, not into docs.
- `docs/tech-debt.md`: a short table of deliberate compromises (what, why, risk, when to fix). Example: "free API host sleeps → slow first request; fix when moving to paid hosting". Every shortcut taken during MVP gets one row.
- `docs/pitfalls.md`: mistakes agents or humans already made in this repo and the rule that prevents them. Keep it short; when a pitfall can be enforced by a lint rule, test, or hook, move it there and delete it from this file.
- Bugs are tracked in **GitHub Issues** (add an issue template: steps, expected, actual, area), not in docs. After a non-trivial bug fix, add a regression test and, if it teaches a general lesson, one line in `docs/pitfalls.md`.
- `docs/design/README.md`: a hand-off for Opus: where design tokens live, how components are organized, what pages exist, i18n constraints (Korean and Russian text lengths differ from English). **Do not design anything yourself.**

### 5.2 Feedback loops for agents

- One command that checks everything: `pnpm check` = typecheck + lint + test, for the whole monorepo.
- ESLint + Prettier with strict rules; **module boundary rules** (web must not import from api; shared must not import from apps).

### 5.3 Claude Code configuration (check the current docs at code.claude.com/docs before writing these)

- **`AGENTS.md` + `CLAUDE.md`**: put the shared rules in `AGENTS.md` (readable by other coding agents too) and make `CLAUDE.md` import it, so the project is not locked to one tool.
- **Path-scoped rules** in `.claude/rules/*.md` with `paths:` frontmatter (for example, Prisma rules load only when the agent touches `prisma/**`). This keeps context small and cheap.
- **Hooks** in `.claude/settings.json` (committed):
  - `PostToolUse` on `Edit|Write`: format and lint the edited file; on failure exit 2 so the agent sees the error immediately.
  - `PreToolUse` on `Bash` and `Edit|Write`: block destructive commands (`rm -rf`, `prisma migrate reset` on non-local DBs, `git push --force`) and block edits to `.env*` files and generated files.
  - `Stop`: run a fast `pnpm check` on changed packages; if it fails, block stopping so the agent fixes it before saying "done".
  - `SessionStart`: print the current branch, the active spec, and uncommitted files as context.
  - Use exec form and `onFailure: "block"` for policy hooks. Hook scripts live in `.claude/hooks/` and are written in Node (TypeScript compiled or plain JS) so they work on any OS.
- **Permissions** in `.claude/settings.json`: allow common safe commands (`pnpm check`, `pnpm test`, `git status`, `git diff`) so the agent does not ask every time; deny network deploys and secret files.
- **Skills** in `.claude/skills/<name>/SKILL.md`, at least:
  - `spec`: write a new spec from the template.
  - `implement`: implement a spec by following the reference feature, then run `pnpm check`.
  - `new-module`: scaffold a new Nest module + shared schemas + web page using the documented recipe.
  - `add-language`: add a new UI language.
  - `review`: review the current diff against the golden rules and the spec.
- **Subagents** in `.claude/agents/`, each with a fixed model to control cost:
  - `reviewer` (Sonnet, read-only tools): reviews a diff against rules and spec.
  - `test-writer` (Sonnet): writes missing tests for changed code.
  - `i18n-checker` (Haiku, read-only): finds hard-coded strings and missing translation keys.
- **GitHub**: CI workflow runs `pnpm check` + build; document how to add Claude Code GitHub Actions for PR review later (optional, costs API credit).
- `pnpm db:reset` and a **seed script** with realistic fake data from the launch niche (tutors, SMM, translators; multiple languages, visa types, cities) so agents can test search without manual setup.
- Playwright runs every end-to-end test in **two viewports: a phone and a desktop**.
- CI on GitHub Actions running the same `pnpm check` plus build.

### 5.4 Golden rules (put them in root CLAUDE.md, refine as needed)

- One feature = one spec = one branch = one PR that passes `pnpm check`.
- Every API input and output is a Zod schema in `packages/shared`.
- Never put business logic in controllers or React components; it goes in services / server-side modules.
- No `any`. No disabled lint rules without a comment explaining why.
- Every user-visible string goes through i18n. No hard-coded UI text.
- Mobile-first: build and check every page at phone width first.
- Never commit secrets. All config through validated env variables.
- When the agent changes an architectural rule, it must update the matching doc or ADR in the same PR.

---

## 6. Work phases

Explain your reasoning briefly in docs: the owner is a software engineering student with some TypeScript experience and wants to **learn** from this structure, not only use it.

### Phase A: Architecture on paper
- `docs/architecture.md`, `docs/domain.md`, all ADRs from section 4.
- The Prisma schema for the MVP (as a draft in the doc, not yet as code).
- **CHECKPOINT A**: summarize the key decisions in 10 bullets and wait for approval.

### Phase B: Monorepo skeleton and tooling
- pnpm + Turborepo, both apps booting, `packages/shared`, strict TS configs, ESLint / Prettier with boundary rules, Docker Compose, env validation, `pnpm check`, CI workflow.
- Next.js with next-intl configured for en / ko / ru and a placeholder home page.
- Nest.js with health check endpoint, config module, global validation, error format, OpenAPI generation.
- **CHECKPOINT B**: `pnpm install && pnpm dev` works, `pnpm check` passes. Wait for approval.

### Phase C: Agent environment
- `AGENTS.md`, all `CLAUDE.md` files, `.claude/rules/`, `docs/specs/_template.md`, `docs/ai/model-routing.md`, `docs/design/README.md`, everything from section 5.3 (hooks, permissions, skills, subagents).
- Test every hook once on purpose (make it fail) to prove it really blocks.
- **CHECKPOINT C**: show the file list and the root `CLAUDE.md`. Wait for approval.

### Phase D: Reference feature, end to end
- Implement **Talent Profile: create, edit, view public profile** fully, as the golden example:
  Prisma model + migration, shared Zod schemas, Nest module (controller / service / tests), typed API client, Next.js pages (plain unstyled shadcn/ui components, Opus will style later), i18n strings in all 3 languages, one Playwright test.
- Auth is needed for editing. Implement the **minimum** auth needed for this flow, or stub it behind a clear interface and say so; the full auth spec goes to Sonnet.
- Add comments in this feature that explain **why** things are done this way, since it is the pattern others copy.
- **CHECKPOINT D**: `pnpm check` passes; give a short walkthrough of the pattern.

### Phase E: Specs for the rest of the MVP
- Write specs in `docs/specs/` for: accounts and auth, search, contact reveal, reports and moderation, legal pages and consent, account deletion.
- Order them and add a short `docs/roadmap.md` with the post-MVP items (chat, reviews, mobile app, monetization) and how each one plugs into the architecture.
- **CHECKPOINT E (final)**: report what was built, what is stubbed, known risks, and the recommended next 3 tasks with the model to use for each.

---

## 7. Definition of done for your whole job

- A new agent with no prior context can read root `CLAUDE.md`, pick any spec in `docs/specs/`, and implement it correctly by copying the reference feature.
- `pnpm check` and CI are green.
- Adding a new UI language, a new API module, or a new page each follows a documented, repeatable recipe.
- Nothing in the design blocks: in-app chat, reviews, a mobile client, or any monetization model.
