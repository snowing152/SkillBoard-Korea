# Legal pages and consent

Status: Ready · Model: Sonnet (pages, API), Haiku (ko/ru translation of the drafts) · ADRs: 0008, 0013,
0017, 0018 · Branch: `feat/legal` · Order: 1 of 6 (`docs/roadmap.md`); `accounts` and
`talent-profiles` changes depend on it.

## Goal

Every visitor, company or private person, can read the privacy policy, the terms of use and the visa
disclaimer in en/ko/ru. Every account records which version of the terms and privacy policy it accepted;
every talent records that they acknowledged the visa disclaimer before creating a profile. Done = three
static pages with a footer link on every page, a `Consent` row per accepted document, and one shared list
of document versions that the API and the web both read. The texts shipped here are **drafts the owner
must review before launch**; they are not legal advice.

## User stories

- As a visitor, I want to read the privacy policy and terms in my language so that I know what happens
  with my data before I sign up.
- As a talent, I want a clear statement that I am responsible for working within my visa, with a link to
  the official rules, so that I am not misled about what the site checks (it checks nothing).
- As a user, I want to see which documents and versions I accepted so that I can trust the record (PIPA).
- As the owner, I want document versions in one place so that a text change forces new sign-ups to
  accept the new version without a code hunt.

## API contract

| Method and route      | Auth | Request schema | Response schema     | Errors            |
| --------------------- | ---- | -------------- | ------------------- | ----------------- |
| `GET /v1/me/consents` | user | –              | `ConsentListSchema` | `UNAUTHENTICATED` |

Schemas in `packages/shared/src/legal/`:

- `legal.ts`: `LEGAL_DOCUMENTS = ['TERMS', 'PRIVACY', 'VISA_DISCLAIMER'] as const` (matches the Prisma
  `ConsentType` enum), `LEGAL_VERSIONS: Record<LegalDocument, string>` = `'2026-10-14'` for all three
  (ISO date of the last text change; bump the value when the text changes),
  `HIKOREA_URL = 'https://www.hikorea.go.kr'`, `SIGNUP_CONSENT_DOCUMENTS = ['TERMS', 'PRIVACY']`.
- `legal.schema.ts`: `LegalDocumentSchema = z.enum(LEGAL_DOCUMENTS)`; `ConsentSchema`
  `{ type: LegalDocumentSchema, version: z.string().max(20), acceptedAt: z.iso.datetime() }`;
  `ConsentListSchema = z.object({ items: z.array(ConsentSchema) })` (no cursor: at most a handful of rows).
- `CreateTalentProfileSchema` gains `acknowledgeVisaDisclaimer: z.literal(true)` (required on `POST`
  only). `UpdateTalentProfileSchema` becomes `CreateTalentProfileSchema.omit({ acknowledgeVisaDisclaimer:
true }).partial().extend({ status })`, so edits never re-ask. Every existing test that posts a profile
  (`talent-profiles.service.spec.ts`, `talent-profiles.e2e-spec.ts`, the Playwright spec) adds the flag.

API module `apps/api/src/modules/consents/` (copy `skills`, the read-only module):

- `ConsentsService.record(userId, documents: LegalDocument[], tx?)`: `createMany` with
  `skipDuplicates: true` of `{ userId, type, version: LEGAL_VERSIONS[type] }`. Exported from the module so
  `auth` (sign-up, this is wired by the `accounts` spec) and `talent-profiles` (profile creation) call it
  inside their own transaction. `ConsentsService.listForUser(userId)` ordered by `acceptedAt desc`.
- `TalentProfilesService.create` records `VISA_DISCLAIMER` in the same transaction that creates the
  profile. The flag itself is not stored; the `Consent` row is the record.

## Data changes

None structural: `Consent` and `ConsentType` exist since `init_mvp_schema`. Seed: every seed user gets
`TERMS` and `PRIVACY` rows, every seed talent also `VISA_DISCLAIMER`, all with the current versions.
Deletion: `Consent` cascades with the user (ADR 0018); nothing else to do.

## UI

| Route            | Kind                                                                                                                                             | States                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `/legal/privacy` | Server page, static, `generateMetadata`                                                                                                          | content only                                      |
| `/legal/terms`   | Server page, static                                                                                                                              | content only                                      |
| `/legal/visa`    | Server page, static                                                                                                                              | content only, HiKorea link opens in a new tab     |
| `/me/account`    | this PR creates a minimal Server page (session required) holding only `components/legal/consent-list.tsx`; `accounts` adds its sections above it | loading, list `type · version · date`, empty text |

- Texts live in `apps/web/messages/<locale>/legal.json` (new namespace; add it to `NAMESPACES` and
  `global.d.ts`): `{ privacy: Doc, terms: Doc, visa: Doc, footer: { privacy, terms, visa },
disclaimer: { short, link } }` where `Doc = { title, updatedLabel, sections: [{ heading, paragraphs:
string[] }] }`. Pages render with `t.raw('privacy.sections')` through one `LegalDocument` component
  (`components/legal/legal-document.tsx`): `<h1>`, "Last updated {date}" using `LEGAL_VERSIONS`, then
  `<h2>` + `<p>` per section. Long text in JSON is deliberate: rule 5 (all UI text through next-intl) and
  the key-parity test keep the three locales in step without a markdown dependency.
- Draft English sections. Privacy (PIPA Art. 30 items): what we collect (email, display name, profile
  text, self-declared visa type, contact channels the talent enters, reveal and report logs, IP in rate
  limiter memory only); purpose; retention (until account deletion, audit rows anonymised); overseas
  storage and processors (Neon Singapore, Vercel, Render, Resend, Google sign-in, Cloudflare R2;
  ADR 0013); who sees contact details (signed-in verified users who click "Contact", logged); user
  rights (view, edit, delete at `/me/account`); cookies (two httpOnly session cookies plus the
  `NEXT_LOCALE` language preference cookie that next-intl sets; no tracking); contact for privacy
  questions via `SUPPORT_EMAIL` (new constant next to `APP_NAME` in `packages/shared/src/app.ts`,
  default `support@skillboard.local`, the owner changes it once; the legal pages and the hidden-profile
  banner of `moderation` render it through an `{email}` placeholder). Terms: the site is a listing board, not an employer or
  agency; no verification of users; prohibited content; moderation (hide, delete); liability limits;
  governing law Republic of Korea. Visa: users are solely responsible for working within their visa;
  the site does not check status; link to HiKorea; clients should ask before hiring.
- `components/legal/visa-disclaimer.tsx` (Server-safe, no state): one sentence (`disclaimer.short`) plus
  the link (`disclaimer.link` → `/legal/visa`). Used in: the profile form next to the visa field
  (`talent-profile-form.tsx`, with the required checkbox `profile.form.acknowledgeVisaDisclaimer`), the
  public profile next to the visa badge (`talent-profile-view.tsx`), and the search filter sheet
  (`search` spec).
- `components/site-footer.tsx` rendered in `app/[locale]/layout.tsx`: three links + language switcher
  slot. Phone: links stacked, 44 px rows; desktop: one row.
- shadcn: checkbox (already present). No new primitives.

## Acceptance criteria

1. Given any locale, when a visitor opens `/legal/privacy`, `/legal/terms` or `/legal/visa`, then the page
   renders server-side with the title and every section, and the footer links point to the same locale.
2. Given the profile create form, when the visa disclaimer checkbox is not checked, then the field error
   shows and no request is sent; when checked, `POST /v1/me/talent-profile` succeeds and
   `GET /v1/me/consents` lists `VISA_DISCLAIMER` with version `LEGAL_VERSIONS.VISA_DISCLAIMER`. [e2e:
   extend `apps/web/e2e/talent-profile.spec.ts` to check the box by label]
3. Given a `PATCH /v1/me/talent-profile`, then no `acknowledgeVisaDisclaimer` is required and no new
   `Consent` row is written.
4. Given a user with consents, when they open the minimal `/me/account`, then each row shows type, version and date
   formatted in Asia/Seoul via next-intl.
5. Given `ConsentsService.record` is called twice for the same user and document version, then one row
   exists (`skipDuplicates`, unit test).
6. The visa disclaimer sentence and link are visible on the public profile at 390 px without horizontal
   scroll, in all three locales.
7. `legal.json` has the same key set and the same `sections.length` per document in en, ko and ru (extend
   the message parity test for arrays).
8. Logs for these routes contain no email or body (`consents.service.spec.ts` spies on
   `Logger.prototype` and asserts it is not called with user data).

Tests: `packages/shared/src/legal/legal.schema.test.ts`, `apps/api/src/modules/consents/consents.service.spec.ts`,
`apps/api/test/consents.e2e-spec.ts` (401 without token, list with token), `apps/web/src/components/legal/legal-document.test.tsx`.

## Out of scope

- Re-consent when a version changes: compare the latest `Consent.version` with `LEGAL_VERSIONS` in
  `GET /v1/me` → a banner. Plug point: `ConsentsService.missingFor(userId)`.
- Cookie banner: the two cookies are strictly necessary; no banner needed under current practice.
- Lawyer-reviewed texts and a named privacy officer: owner task before launch (`docs/roadmap.md`).
- Marketing or analytics consent: no analytics in MVP.

## Open questions

None.
