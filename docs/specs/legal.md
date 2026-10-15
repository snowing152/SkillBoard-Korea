# Legal pages and versioned consent

Status: Implemented · Model: Sonnet (pages, API), Haiku (ko/ru translation of the drafts) · ADRs: 0008, 0013,
0017, 0018, 0021, 0022 · Branch: `feat/legal` · Order: 1 of 6 (`docs/roadmap.md`); `accounts` and
`talent-profiles` changes depend on it.

## Goal

Every visitor, company or private person, can read the privacy policy, the terms of use and the visa
disclaimer in en/ko/ru. Every account records which version of each document it accepted, in which UI
language and when; when a document version changes, the user must accept the new version on the next
sign-in before using the account. Done = three static pages with a footer link on every page, one
`Consent` row per accepted document version, a `/consent` page that collects missing acceptances, and one
shared list of document versions that the API and the web both read. The texts shipped here are **drafts
the owner must review before launch**; they are not legal advice.

## User stories

- As a visitor, I want to read the privacy policy and terms in my language so that I know what happens
  with my data before I sign up.
- As a talent, I want a clear statement that I am responsible for working within my visa, with a link to
  the official rules, so that I am not misled about what the site checks (it checks nothing).
- As a user, I want to see which documents and versions I accepted so that I can trust the record (PIPA).
- As a user, when the privacy policy changes, I want to be shown the new version once and accept it, not
  be surprised later.
- As the owner, I want document versions in one place so that a text change forces every user to accept
  the new version without a code hunt.

## API contract

| Method and route       | Auth | Request schema         | Response schema     | Errors                                 |
| ---------------------- | ---- | ---------------------- | ------------------- | -------------------------------------- |
| `GET /v1/me/consents`  | user | –                      | `ConsentListSchema` | `UNAUTHENTICATED`                      |
| `POST /v1/me/consents` | user | `AcceptConsentsSchema` | `ConsentListSchema` | `VALIDATION_FAILED`, `UNAUTHENTICATED` |

Schemas in `packages/shared/src/legal/`:

- `legal.ts`: `LEGAL_DOCUMENTS = ['TERMS', 'PRIVACY', 'VISA_DISCLAIMER'] as const` (matches the Prisma
  `ConsentType` enum), `LEGAL_VERSIONS: Record<LegalDocument, string>` = `'2026-10-14'` for all three
  (the document version id: ISO date of the last text change; bump it when the text changes),
  `HIKOREA_URL = 'https://www.hikorea.go.kr'`, `SIGNUP_CONSENT_DOCUMENTS = ['TERMS', 'PRIVACY']`.
- `legal.schema.ts`: `LegalDocumentSchema = z.enum(LEGAL_DOCUMENTS)`; `ConsentSchema = z.object({ type:
LegalDocumentSchema, version: z.string().max(20), locale: LocaleSchema, acceptedAt: z.iso.datetime() })`;
  `ConsentListSchema = z.object({ items: z.array(ConsentSchema), pending: z.array(LegalDocumentSchema) })`
  (no cursor: a handful of rows); `AcceptConsentsSchema = z.object({ documents:
z.array(LegalDocumentSchema).min(1).max(3), locale: LocaleSchema })`.
- `AuthUserSchema` (`accounts`) gains `pendingConsents: z.array(LegalDocumentSchema)`, computed by
  `ConsentsService.pendingFor`. Until `accounts` ships, this spec adds the field to the existing
  `AuthUserSchema` and `AuthService.session`.
- `CreateTalentProfileSchema` gains `acknowledgeVisaDisclaimer: z.literal(true)` (required on `POST`
  only). `UpdateTalentProfileSchema` becomes `CreateTalentProfileSchema.omit({ acknowledgeVisaDisclaimer:
true }).partial().extend({ status })`, so edits never re-ask. Every existing test that posts a profile
  (`talent-profiles.service.spec.ts`, `talent-profiles.e2e-spec.ts`, the Playwright spec) adds the flag.

API module `apps/api/src/modules/consents/` (copy `skills`, then add the one write):

- `ConsentsService.record(userId, documents, locale, tx?)`: `createMany` with `skipDuplicates: true` of
  `{ userId, type, version: LEGAL_VERSIONS[type], locale }`. Exported so `auth` (sign-up, wired by
  `accounts`) and `talent-profiles` (profile creation, the user's `locale` column) call it inside their
  own transaction.
- `ConsentsService.requiredFor(userId)` = `SIGNUP_CONSENT_DOCUMENTS` plus `VISA_DISCLAIMER` when the user
  has a `TalentProfile`. `pendingFor(userId)` = required documents with no `Consent` row at the current
  `LEGAL_VERSIONS` value. `listForUser(userId)` ordered by `acceptedAt desc` plus `pending`.
- `TalentProfilesService.create` records `VISA_DISCLAIMER` in the same transaction that creates the
  profile. The flag itself is not stored; the `Consent` row is the record.
- Nothing is blocked on the API while consents are pending (keeps mobile free to render its own screen);
  the web enforces the redirect below.

## Data changes

Migration `add_consent_locale`: `Consent.locale String` (validated against `LOCALES`; backfill `'en'`).
The unique key `(userId, type, version)` stays, so re-acceptance of a new version adds a row and the
history is kept. Seed: every seed user gets `TERMS` and `PRIVACY` rows, every seed talent also
`VISA_DISCLAIMER`, all at the current versions, locale `en`. Deletion: `Consent` cascades with the user
(ADR 0018); nothing else to do.

## UI

| Route            | Kind                                                                                                                                             | States                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `/legal/privacy` | Server page, static, `generateMetadata`                                                                                                          | content only                                                                                                           |
| `/legal/terms`   | Server page, static                                                                                                                              | content only                                                                                                           |
| `/legal/visa`    | Server page, static                                                                                                                              | content only, HiKorea link opens in a new tab                                                                          |
| `/consent`       | Server page (session required) reads `?next=` (`SafePathSchema`, `accounts`) + Client form `components/legal/consent-form.tsx`                   | one checkbox per pending document with its link and version date; submitting; success → `next` or `/me/talent-profile` |
| `/me/account`    | this PR creates a minimal Server page (session required) holding only `components/legal/consent-list.tsx`; `accounts` adds its sections above it | loading, list `type · version · locale · date`, empty text                                                             |
| `/me/*` layout   | `app/[locale]/(main)/me/layout.tsx` (created here, extended by `accounts`)                                                                       | `pendingConsents` not empty → `redirect('/consent?next=<current path>')`; `/consent` itself is outside `/me`           |

- The sign-in action (`accounts`) and `/auth/callback` also redirect to `/consent?next=` when
  `pendingConsents` is not empty; this spec adds that line to the existing `signIn` action.
- Texts live in `apps/web/messages/<locale>/legal.json` (new namespace; add it to `NAMESPACES` and
  `global.d.ts`): `{ privacy: Doc, terms: Doc, visa: Doc, footer: { privacy, terms, visa },
disclaimer: { short, link }, consent: { title, intro, accept (rich text with <doc> tag), version
("Version {date}"), submit }, list: { title, empty, locale } }` where `Doc = { title, updatedLabel,
sections: [{ heading, paragraphs: string[] }] }`. Pages render with `t.raw('privacy.sections')` through
  one `LegalDocument` component (`components/legal/legal-document.tsx`): `<h1>`, "Last updated {date}"
  using `LEGAL_VERSIONS`, then `<h2>` + `<p>` per section. Long text in JSON is deliberate: rule 5 (all
  UI text through next-intl) and the key-parity test keep the three locales in step without a markdown
  dependency.
- Draft English sections. Privacy (PIPA Art. 30 items): what we collect (email, display name, profile
  text, self-declared visa type, contact channels the talent enters, reveal and report logs, consent
  records with language and time, IP in rate limiter memory only); purpose; retention (until account
  deletion plus a 14-day grace period; audit rows anonymised; for accounts hidden by moderation, a salted
  hash of the email, the reason code and the date are kept for 1 year to prevent re-registration, ADR
  0022); storage in Korea (Supabase Seoul, ADR 0021) and overseas processors (Vercel, Render Singapore,
  Resend, Google sign-in, Cloudflare R2; ADR 0013); who sees contact details (signed-in verified users
  who click "Contact", logged); user rights (view, edit, delete at `/me/account`, cancel a deletion within
  14 days); cookies (two httpOnly session cookies plus the `NEXT_LOCALE` language preference cookie that
  next-intl sets; no tracking); contact for privacy questions via `SUPPORT_EMAIL` (new constant next to
  `APP_NAME` in `packages/shared/src/app.ts`, default `support@skillboard.local`, the owner changes it
  once; the legal pages and the hidden-profile banner of `moderation` render it through an `{email}`
  placeholder). Terms: the site is a listing board, not an employer or agency; no verification of users;
  prohibited content; moderation (hide, delete, block re-registration); liability limits; governing law
  Republic of Korea. Visa: users are solely responsible for working within their visa; the site does not
  check status; link to HiKorea; clients should ask before hiring.
- `components/legal/visa-disclaimer.tsx` (Server-safe, no state): one sentence (`disclaimer.short`) plus
  the link (`disclaimer.link` → `/legal/visa`). Used in: the profile form next to the visa field
  (`talent-profile-form.tsx`, with the required checkbox `profile.form.acknowledgeVisaDisclaimer`), the
  public profile next to the visa badge (`talent-profile-view.tsx`), and the search filter sheet
  (`search` spec).
- `components/shell/site-footer.tsx` rendered by `AppShell` and the public profile: three legal links
  slot. Phone: links stacked, 44 px rows; desktop: one row.
- shadcn: checkbox (already present). No new primitives.

## Acceptance criteria

1. Given any locale, when a visitor opens `/legal/privacy`, `/legal/terms` or `/legal/visa`, then the page
   renders server-side with the title and every section, and the footer links point to the same locale.
2. Given the profile create form, when the visa disclaimer checkbox is not checked, then the field error
   shows and no request is sent; when checked, `POST /v1/me/talent-profile` succeeds and
   `GET /v1/me/consents` lists `VISA_DISCLAIMER` with version `LEGAL_VERSIONS.VISA_DISCLAIMER` and the
   user's locale. [e2e: extend `apps/web/e2e/talent-profile.spec.ts` to check the box by label]
3. Given a `PATCH /v1/me/talent-profile`, then no `acknowledgeVisaDisclaimer` is required and no new
   `Consent` row is written.
4. Given a user whose `PRIVACY` consent is at an older version than `LEGAL_VERSIONS.PRIVACY`, when they
   sign in, then they land on `/consent` listing only `PRIVACY`; after accepting, `POST /v1/me/consents`
   has added a row at the new version (the old row stays) and they continue to `next`. Service unit test
   with a stubbed `LEGAL_VERSIONS`; e2e by seeding one user with an outdated version. [e2e]
5. Given pending consents, when the user opens any `/me/*` page directly, then they are redirected to
   `/consent?next=<that page>`; given none pending, no redirect.
6. Given a client (no profile), then `VISA_DISCLAIMER` is never pending for them.
7. Given a user with consents, when they open the minimal `/me/account`, then each row shows type,
   version, locale and date formatted in Asia/Seoul via next-intl.
8. Given `ConsentsService.record` is called twice for the same user, document and version, then one row
   exists (`skipDuplicates`, unit test).
9. The visa disclaimer sentence and link are visible on the public profile at 390 px without horizontal
   scroll, in all three locales; the `/consent` page fits 390 px.
10. `legal.json` has the same key set and the same `sections.length` per document in en, ko and ru
    (extend the message parity test for arrays).
11. Logs for these routes contain no email or body (`consents.service.spec.ts` spies on
    `Logger.prototype` and asserts it is not called with user data).

Tests: `packages/shared/src/legal/legal.schema.test.ts`,
`apps/api/src/modules/consents/consents.service.spec.ts`, `apps/api/test/consents.e2e-spec.ts` (401
without token, list and accept with token), `apps/web/src/components/legal/legal-document.test.tsx`,
`apps/web/e2e/consent.spec.ts`.

## Out of scope

- Cookie banner: the cookies are strictly necessary; no banner needed under current practice.
- Lawyer-reviewed texts and a named privacy officer: owner task before launch (`docs/roadmap.md`).
- Marketing or analytics consent: no analytics in MVP.
- Showing a diff between document versions: link to the current page is enough for MVP.

## Open questions

None.
