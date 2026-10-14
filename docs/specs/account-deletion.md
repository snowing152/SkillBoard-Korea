# Account deletion: 14-day grace period, scheduled purge, blocked re-registration for moderated accounts

Status: Ready · Model: Sonnet (Opus reviews the purge job and the email hash) · ADRs: 0013, 0017, 0018,
0020, 0021, 0022 · Branch: `feat/account-deletion` · Order: 6 of 6 · Depends on `accounts`
(`/me/account`, `hasPassword`, `REASON_CODES`, `MailPort`), `moderation` (`hiddenReasonCode`) and, for
its e2e only, `contact-reveal`.

## Goal

A user, talent or client, requests deletion from the settings page after confirming with their password
(or a typed confirmation for Google-only accounts). At once the profile disappears from search and its
public URL, every session ends, sign-in is blocked, and an email offers a cancel link for 14 days. A
daily job then hard-deletes the account; audit rows keep working without a person behind them. Accounts
that were hidden by moderation leave a salted email hash that blocks re-registration for a year. Done =
the privacy policy's promises about deletion are true, the purge runs from GitHub Actions, and the
Playwright suite cleans up the users it creates.

## User stories

- As a talent who found a job, I want to delete my account and profile so that my contact details and
  visa status stop being visible immediately.
- As a user who deleted in a hurry, I want 14 days to change my mind with one click from the email.
- As a parent who no longer needs a tutor, I want to delete my client account without an email exchange
  beyond the confirmation.
- As the site, I want reports and reveal logs to survive anonymised, and scammers who were hidden not to
  come back with the same email the next day.
- As an admin, I must not be able to delete the admin account from the same page.

## API contract

| Method and route                             | Auth                      | Request schema        | Response schema                | Errors                                                                                                      |
| -------------------------------------------- | ------------------------- | --------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `DELETE /v1/me`                              | user                      | `DeleteAccountSchema` | 202, `DeletionScheduledSchema` | `VALIDATION_FAILED`; `FORBIDDEN` + reason `WRONG_PASSWORD` or `ADMIN_ACCOUNT`; `CONFLICT` (already pending) |
| `POST /v1/auth/deletion/cancel`              | public                    | `TokenSchema`         | 204                            | `NOT_FOUND` (unknown, used or expired token); 10/min per IP like other `/auth/*`                            |
| `POST /v1/admin/jobs/purge-deleted-accounts` | job token (`x-job-token`) | `PurgeJobSchema`      | `PurgeResultSchema`            | `UNAUTHENTICATED` (missing or wrong token)                                                                  |

Schemas in `packages/shared/src/auth/account.schema.ts` and `packages/shared/src/admin/jobs.schema.ts`:

- `DeleteAccountSchema = z.object({ password: PasswordSchema.optional(), confirmation: z.literal('DELETE') })`.
  The literal is typed by the user in every case (prevents a one-tap mistake); the password is required
  by the service when `passwordHash` is set and ignored otherwise. `DELETE_CONFIRMATION = 'DELETE'`
  exported for the form label ("Type DELETE to confirm"; the word is not translated so the schema stays
  locale-free; the label explains it in each locale).
- `DeletionScheduledSchema = z.object({ purgeAfter: z.iso.datetime() })`.
- `PurgeJobSchema = z.object({ graceDays: z.coerce.number().int().min(0).max(90).optional() })`
  (default `DELETION_GRACE_DAYS`; the e2e passes `0`); `PurgeResultSchema = z.object({ purged:
z.number().int(), blocked: z.number().int(), expiredBlocksRemoved: z.number().int() })`.
- `REASON_CODES` (`accounts`) gains `DELETION_PENDING` and `EMAIL_BLOCKED`.
- `DELETION_GRACE_DAYS_DEFAULT = 14`, `BLOCKED_EMAIL_RETENTION_DAYS = 365` in `auth/account.ts`.

Service rules (`AccountService` in `modules/auth/`; `PurgeService` in `modules/admin/`):

1. **Request** (`deleteAccount(userId, input)`, transaction): load `id, email, locale, passwordHash,
roles, deletionRequestedAt`. Already pending → `CONFLICT`. `ADMIN` in roles → `FORBIDDEN`
   `ADMIN_ACCOUNT`. `passwordHash` set → `password` required (`VALIDATION_FAILED` when absent) and must
   verify with argon2, else `FORBIDDEN` `WRONG_PASSWORD`. Then set `deletionRequestedAt = now()`, set
   `revokedAt` on every refresh token, create a `VerificationToken` with purpose `DELETION_CANCEL` and
   `expiresAt = now + graceDays`, and send the "deletion scheduled" email (`MailPort`, templates in
   the user's locale) with `${WEB_URL}/${locale}/account/cancel-deletion?token=…` and the purge date.
   Return `purgeAfter`.
2. **Effects while pending**: `PUBLICLY_VISIBLE` (`docs/domain.md`) contains `user.deletionRequestedAt:
null`, so search, `/t/[slug]`, contact reveal and reports treat the profile as missing. `AuthService.login`,
   `refresh` and the Google `exchange` answer `FORBIDDEN` with reason `DELETION_PENDING` when the user
   has `deletionRequestedAt` (checked before issuing tokens). An access token issued before the request
   stays valid for its TTL (`docs/tech-debt.md`).
3. **Cancel** (`cancelDeletion(token)`): find the unused, unexpired `DELETION_CANCEL` token by hash →
   clear `deletionRequestedAt`, mark the token used, in one transaction. Nothing else was changed, so the
   account is exactly as before; the user signs in again normally. Log the outcome and the user id only.
4. **Purge** (`PurgeService.run(graceDays)`): select users with `deletionRequestedAt < now - graceDays`,
   including `talentProfile.hiddenAt` and `hiddenReasonCode`. For each, in a transaction: if the profile
   was hidden, `blockedEmail.upsert` by `emailHash = sha256(email + EMAIL_HASH_PEPPER)` (email is already
   lower-cased) with `reasonCode = hiddenReasonCode ?? 'OTHER'`, `blockedAt = now`, `expiresAt = now +
365 days`; then `user.delete` (cascades remove `TalentProfile` and children, `AuthIdentity`,
   `RefreshToken`, `VerificationToken`, `Consent`; `SetNull` keeps the user's `Report` as reporter,
   `ContactReveal` as viewer and `ModerationAction` as admin). Finally `deleteMany` of `BlockedEmail`
   rows with `expiresAt < now`. Log the three counts and the requestId only.
5. **Blocked emails**: `AuthService.register` and the Google sign-up path compute the same hash and
   answer `FORBIDDEN` with reason `EMAIL_BLOCKED` when an unexpired row exists. The message does not
   say why.
6. **Job guard**: `JobTokenGuard` in `common/auth/` compares `x-job-token` with `JOB_SECRET` using a
   constant-time comparison; the route is `@Public()` for the JWT guard and `@UseGuards(JobTokenGuard)`.
   No user context, so no `@CurrentUser()`.

Env (`EnvSchema` + `.env.example`): `JOB_SECRET` (min 32), `EMAIL_HASH_PEPPER` (min 32, separate from
every other secret), `DELETION_GRACE_DAYS` (0–90, default 14).

Workflow `.github/workflows/purge-deleted-accounts.yml`: `schedule: cron '0 3 * * *'` (12:00 KST) plus
`workflow_dispatch`; one step `curl --fail -X POST "$API_URL/v1/admin/jobs/purge-deleted-accounts" -H
"x-job-token: $JOB_SECRET" -H 'content-type: application/json' -d '{}'` with the two repository secrets.
Document in the workflow file that it also keeps Supabase and Render awake (ADR 0021).

## Data changes

Migration `soft_delete_and_blocked_emails`: `User.deletionRequestedAt DateTime?` with an index;
`TokenPurpose` gains `DELETION_CANCEL`; new model `BlockedEmail { id uuid(7), emailHash String @unique,
reasonCode String, blockedAt DateTime @default(now()), expiresAt DateTime @index }` with no relation to
`User` (it must survive the user). Seed: one user `deleted-pending@skillboard.local` with
`deletionRequestedAt` 2 days ago and a published profile (must not appear in search), one `BlockedEmail`
row for `blocked@skillboard.local` (registration must fail). Playwright teardown (`e2e/helpers/api.ts`):
`DELETE /v1/me` for each registered user, then one `POST /v1/admin/jobs/purge-deleted-accounts` with
`{ graceDays: 0 }` and `E2E_JOB_SECRET`, closing the tech-debt row about `e2e-web-*` users.

## UI

Namespace `account` (owned by `accounts`) gains a `delete` group. Actions in `src/actions/account.ts`:
`deleteAccount(input)` (validate, call `DELETE /v1/me`, on success `clearSession()`, redirect to
`/?deletionRequested=<purgeAfter date>`), `cancelDeletion(token)`.

| Route                      | Kind                                               | States                                                                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/me/account`              | existing page; "Danger zone" section at the bottom | one destructive-variant button "Delete account" linking to `/me/account/delete`                                                                                                                                                                                |
| `/me/account/delete`       | Server page (session required) + Client form       | explanation list (hidden at once, deleted after 14 days, what stays anonymised, cancel by email), password field only when `hasPassword`, "Type DELETE" field, submit disabled until valid, submitting, `WRONG_PASSWORD`, `ADMIN_ACCOUNT`, `CONFLICT`, generic |
| `/account/cancel-deletion` | Server page reads `?token`, Client confirm button  | confirming, success ("Your account is back", link to `/sign-in`), `NOT_FOUND` → "This link expired or was used"                                                                                                                                                |
| `/sign-in`                 | existing form                                      | `DELETION_PENDING` → `auth.errors.DELETION_PENDING` ("This account is scheduled for deletion. Use the link in your email to cancel.")                                                                                                                          |
| `/sign-up`                 | existing form                                      | `EMAIL_BLOCKED` → `auth.errors.EMAIL_BLOCKED` ("This email cannot be used to register.")                                                                                                                                                                       |
| `/`                        | home                                               | `?deletionRequested=<date>` shows a dismissible banner "Your account will be deleted on {date}. Check your email to cancel." (Server Component reads `searchParams`, formats the date in Asia/Seoul)                                                           |

- Phone first: single column; the destructive button is full width and separated from other actions by a
  heading so it cannot be hit by mistake. Desktop: same card.
- Keys (`account.delete`): `title`, `button`, `intro`, `now.title`, `now.hidden`, `now.signedOut`,
  `later.title` (`{days}`), `later.deleted`, `later.cancel`, `willKeep.title`, `willKeep.reports`,
  `willKeep.reveals`, `willKeep.blocked` (only shown when the profile is hidden: "Because your profile was
  hidden by moderation, a hashed copy of your email is kept for one year"), `password`, `confirmation`
  ("Type {word} to confirm"), `confirmationMismatch`, `submit`, `wrongPassword`, `adminAccount`,
  `alreadyPending`, `cancel.title`, `cancel.body`, `cancel.button`, `cancel.success`, `cancel.expired`.
  (`home`): `deletionBanner` (`{date}`), `dismiss`. (`auth.errors`): `DELETION_PENDING`, `EMAIL_BLOCKED`.

## Acceptance criteria

1. Given a talent with a published, verified profile and a password, when they type the password and
   `DELETE` and submit, then the API answers 202 with `purgeAfter` 14 days ahead, the browser lands on `/`
   with the banner, the session cookies are gone, `/t/<slug>` is 404, `GET /v1/talents` omits the
   profile, and signing in answers 403 `DELETION_PENDING`. [e2e]
2. Given the cancel link from the email (the e2e reads the token from the console mail adapter output or
   inserts one through Prisma), when it is opened and confirmed, then `deletionRequestedAt` is null, the
   profile is public again, sign-in works, and a second use of the link answers 404. [e2e]
3. Given a wrong password, then 403 `WRONG_PASSWORD` and nothing changes; given a pending deletion, a
   second `DELETE /v1/me` answers 409.
4. Given `confirmation: 'delete'` (lower-case) or missing, then 400 on the API and the submit button is
   disabled in the form (same schema).
5. Given a Google-only account, then no password field renders and the request succeeds with the
   confirmation alone (service unit test).
6. Given the seeded admin, then 403 `ADMIN_ACCOUNT` and the page explains it.
7. Given the purge job with `graceDays: 0` after a client who filed a report and revealed contacts
   requested deletion, then the user row is gone, the `Report` row has `reporterUserId = null` and the
   `ContactReveal` row has `viewerUserId = null`, both still present (API e2e).
8. Given a talent whose profile was hidden with `SCAM`, when purged, then a `BlockedEmail` row with the
   email hash, `reasonCode = 'SCAM'` and `expiresAt` one year ahead exists, and `POST /v1/auth/register`
   with that email answers 403 `EMAIL_BLOCKED`; a `BlockedEmail` row with `expiresAt` in the past is
   removed by the next run and that email can register again (API e2e).
9. Given a talent that was not hidden, when purged, then no `BlockedEmail` row is written.
10. Given the purge endpoint without the header or with a wrong token, then 401 and nothing is deleted;
    given a user whose request is younger than `graceDays`, then they are not purged.
11. Given a request without a token, then `DELETE /v1/me` answers 401.
12. The pages render in en, ko and ru; the explanation and both fields fit 390 px; the destructive button
    is at least 44 px high.
13. Logs for request, cancel and purge contain ids, counts and the requestId only, never an email or
    hash (`account.service.spec.ts` and `purge.service.spec.ts` spy on `Logger.prototype`).
14. The Playwright suite leaves no `e2e-web-*` users behind (teardown asserts the purge result).
15. The purge workflow calls the endpoint with `curl --fail`, so an HTTP error fails the run and GitHub
    emails the owner (tech-debt row on scheduled-workflow expiry).

Tests: `packages/shared/src/auth/account.schema.test.ts`, `apps/api/src/modules/auth/account.service.spec.ts`,
`apps/api/src/modules/admin/purge.service.spec.ts`, `apps/api/src/common/auth/job-token.guard.spec.ts`,
`apps/api/test/account-deletion.e2e-spec.ts`, `apps/web/e2e/account-deletion.spec.ts`.

## Out of scope

- Deleting a talent profile while keeping the account: `DELETE /v1/me/talent-profile`, trivial later.
- Admin-initiated deletion, legal hold, and unblocking an email by hand: admin module growth
  (`docs/roadmap.md`).
- Data export (PIPA right of access): `GET /v1/me/export` returning JSON of the user's rows.
- A reminder email two days before the purge: `notifications` module.
- Blocking by anything other than email (phone, device): no such data is collected (ADR 0018).

## Open questions

None.
