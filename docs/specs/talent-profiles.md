# Talent profile: create, edit, view (reference feature)

Status: Implemented · Model: Fable (reference), later changes Sonnet · ADRs: 0009, 0014, 0016, 0017, 0018,
0019 · Branch: `feat/talent-profiles`

This is the feature every other feature copies. It shows the full path shared schema → Prisma → Nest
module → typed client → Next.js pages → messages → tests, plus the minimum auth the path needs.

## Goal

A talent (a foreigner in Korea: tutor, SMM manager, translator, …) signs in, creates one profile
(headline, description, skills, languages, city, work mode, self-declared visa type, video link, portfolio
links, contact methods), publishes it, and gets a public page `/t/<slug>` that anyone, company or private
person, can open without an account. Done = the owner can create, edit and publish on a phone; the public
page renders on the server and is 404 while the profile is a draft or hidden.

## User stories

- As a talent, I want to sign in with email and password so that I can manage my profile.
- As a talent, I want to create my profile once and edit it later so that my card stays current.
- As a talent, I want to keep the profile as a draft until I publish it so that nobody sees half a page.
- As a talent, I want to enter the contact channels I am willing to share so that clients can reach me
  (shown to clients only through the contact-reveal feature, not on the public page).
- As a visitor (company or private person), I want to open `/t/<slug>` and a list of newest talent so
  that I can judge someone before contacting them.
- As a visitor, I must not see draft or hidden profiles.

## API contract

| Method and route              | Auth   | Request schema                                          | Response schema                     | Errors                                             |
| ----------------------------- | ------ | ------------------------------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `POST /v1/auth/register`      | public | `RegisterSchema`                                        | `AuthSessionSchema`                 | `VALIDATION_FAILED`, `CONFLICT` (email taken)      |
| `POST /v1/auth/login`         | public | `LoginSchema`                                           | `AuthSessionSchema`                 | `UNAUTHENTICATED` (same message for unknown email) |
| `GET /v1/skills`              | public | –                                                       | `SkillCatalogSchema`                | –                                                  |
| `GET /v1/talents`             | public | `TalentProfileQuerySchema` (`limit`, `cursor`)          | `paginatedSchema(TalentCardSchema)` | `VALIDATION_FAILED`                                |
| `GET /v1/talents/:slug`       | public | –                                                       | `TalentProfileSchema`               | `NOT_FOUND` (missing, draft or hidden)             |
| `GET /v1/me/talent-profile`   | user   | –                                                       | `MyTalentProfileSchema`             | `UNAUTHENTICATED`, `NOT_FOUND` (no profile yet)    |
| `POST /v1/me/talent-profile`  | user   | `CreateTalentProfileSchema`                             | `MyTalentProfileSchema`             | `VALIDATION_FAILED`, `CONFLICT` (already has one)  |
| `PATCH /v1/me/talent-profile` | user   | `UpdateTalentProfileSchema` (partial create + `status`) | `MyTalentProfileSchema`             | `VALIDATION_FAILED`, `NOT_FOUND`                   |

Schemas live in `packages/shared/src/auth/` and `packages/shared/src/talent-profiles/`.

- `RegisterSchema`: `email` (trimmed, lower-cased, max 254), `password` (8–128), `displayName` (trimmed,
  2–50), `role` (`TALENT` | `CLIENT`). `LoginSchema`: `email`, `password`.
- `AuthSessionSchema`: `{ accessToken, expiresInSeconds, user: { id, email, displayName, roles, locale } }`.
- `CreateTalentProfileSchema`: `headline` (trimmed 3–80), `description` (trimmed 20–2000), `cityCode`
  (`CITY_CODES` or null), `workMode` (`WORK_MODES`, default `HYBRID`), `visaType` (`VISA_TYPES` or null),
  `videoUrl` (http/https URL or null), `skillIds` (1–10 UUIDs, unique), `languages` (1–10 of
  `{ languageCode: LANGUAGE_CODES, level: LANGUAGE_LEVELS }`, unique codes), `portfolioLinks` (0–5 of
  `{ url, label? ≤ 60 }`), `contactMethods` (0–3 of `{ type: CONTACT_TYPES, value ≤ 120 }`, unique types).
- `UpdateTalentProfileSchema` = `CreateTalentProfileSchema.partial()` + `status` (`DRAFT` | `PUBLISHED`,
  optional). Arrays replace the stored list as a whole (simplest rule for forms and mobile).
- `TalentProfileSchema` (public): `id, slug, displayName, headline, description, photoUrl, videoUrl,
cityCode, workMode, visaType, publishedAt, skills[{ id, slug, names }], languages[], portfolioLinks[{ id, url, label }]`.
  Never contains contact methods or status.
- `TalentCardSchema`: the list item (`id, slug, displayName, headline, photoUrl, cityCode, workMode,
visaType, skills, languages`).
- `MyTalentProfileSchema` = `TalentProfileSchema` + `status, hiddenAt, contactMethods[{ id, type, value }],
createdAt, updatedAt`. Owner only.
- Rate limits: `/v1/auth/*` 10 requests/min per IP (ADR 0018). Lists: cursor = last `id` (UUID v7),
  newest first, no filters yet (the search spec adds them).
- Slug: `slugify(displayName)` (ASCII only; Cyrillic or Hangul names fall back to `talent`) plus a 4-char
  suffix on collision. Chosen once at creation, never changed by edits (public URLs stay stable).

## Data changes

The whole MVP schema from the former draft in `docs/domain.md` becomes `apps/api/prisma/schema.prisma`
in migration `init_mvp_schema` (all tables, so later specs add no structural migrations unless they
change a column). This feature reads and writes: `User` (roles, `passwordHash`), `TalentProfile`,
`TalentSkill`, `TalentLanguage`, `PortfolioLink`, `ContactMethod`, `Skill`, `SkillCategory`.
Creating a profile adds the `TALENT` role to the user if missing. Deleting the user cascades to the
profile and its children (PIPA, ADR 0018).

Seed (`apps/api/prisma/seed.ts`, deterministic): 4 skill categories, 16 skills, admin
`admin@skillboard.local`, client `client@skillboard.local`, 20 talents `talent01..20@skillboard.local`
(18 published, 1 draft, 1 hidden) across Seoul/Busan/Incheon/Daegu, ru/en/ko/uz speakers, mixed visa
types, 2 open reports. Password for every seed user: `Password123!`.

## UI

Routes under `/[locale]/…`; all strings in namespaces `auth`, `profile`, `reference`, `common.errors`.

| Route                     | Kind                                                     | States                                                                                                             |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/sign-in`                | Server page + Client form (`components/auth/`)           | idle, submitting, error `UNAUTHENTICATED` → `auth.errors.invalidCredentials`; other codes → `common.errors.<CODE>` |
| `/me/talent-profile`      | Server page, requires session (else redirect `/sign-in`) | loading (`loading.tsx`), empty (no profile → call to create), draft banner, hidden banner, published               |
| `/me/talent-profile/edit` | Server page loads skills + profile, Client form          | create vs edit, field errors from Zod (`zodResolver`), API errors mapped by code, success → redirect to view       |
| `/t/[slug]`               | Server page, SEO metadata                                | published; draft/hidden/missing → `notFound()`                                                                     |
| `/talents`                | Server page, cursor pagination via `?cursor=`            | loading, empty, list, "load more" link                                                                             |

Session: the web keeps the API access token in an `httpOnly` cookie (`src/lib/session.ts`); Server
Actions in `src/actions/` call the API with it. Browser code never holds the token (ADR 0019).
shadcn components used: button, input, textarea, label, native-select, checkbox, card, badge, alert,
field. Phone first: single column, full-width controls, 44 px targets; desktop adds a max width.

## Acceptance criteria

1. Given a signed-out user, when they open `/me/talent-profile`, then they are redirected to `/sign-in`.
2. Given valid credentials, when the user signs in, then they land on `/me/talent-profile` and see the
   empty state with a "Create profile" action. [e2e]
3. Given the create form, when a headline shorter than 3 characters or no skill is submitted, then the
   field error is shown and no request is sent (same Zod schema as the API).
4. Given a valid form, when submitted, then `POST /v1/me/talent-profile` creates a `DRAFT` profile and the
   user sees it with a draft banner. [e2e]
5. Given a draft profile, when a visitor opens `/t/<slug>`, then the response is 404. [e2e]
6. Given the owner publishes (`status: PUBLISHED`), when a visitor opens `/t/<slug>`, then the headline,
   display name, skills and languages render server-side, without contact methods. [e2e]
7. Given a second `POST /v1/me/talent-profile` for the same user, then the API answers 409 `CONFLICT`.
8. Given `GET /v1/talents`, then only `PUBLISHED` profiles with `hiddenAt IS NULL` are returned, newest
   first, with `nextCursor` after `limit` items.
9. Given a hidden profile, when its owner opens `/me/talent-profile`, then they see the hidden banner.
10. All pages render in en, ko and ru with no missing keys (unit test) and work at 390 px.
11. Logs never contain emails, passwords or tokens; `passwordHash` never appears in a response (unit test
    on `AuthService`, output schemas strip it).

Tests: `packages/shared/src/talent-profiles/*.test.ts`, `packages/shared/src/auth/*.test.ts`,
`apps/api/src/modules/*/\*.service.spec.ts`, `apps/api/test/talent-profiles.e2e-spec.ts`,
`apps/web/src/lib/api-errors.test.ts`, `apps/web/e2e/talent-profile.spec.ts`.

## Out of scope

- Google sign-in, email verification, refresh tokens, password reset, consent recording, sign-up page:
  `docs/specs/accounts.md` (Phase E). Register exists only so the flow and tests can create users.
- Photo upload (`photoUrl` stays null): a `profile-photo` spec with `StoragePort` (ADR 0013).
- Search filters and ranking: `search` spec moves `GET /v1/talents` and `listPublic` into a `search`
  module (`SearchService`, ADR 0016) and extends the query schema with filters.
- Contact reveal: `contact-reveal` spec adds `POST /v1/talents/:slug/contact-reveals`, reading
  `ContactMethod` through the service and logging `ContactReveal`.
- Admin hide/unhide and reports: `moderation` spec (`/v1/admin/...`, `@Roles('ADMIN')`).
- Deleting a profile on its own: account deletion cascades; a standalone delete is not needed in MVP.

## Open questions

None.
