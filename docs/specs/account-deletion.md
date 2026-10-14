# Account deletion: self-service, immediate, hard delete (PIPA)

Status: Ready · Model: Sonnet · ADRs: 0017, 0018, 0020 · Branch: `feat/account-deletion` ·
Order: 6 of 6 · Depends on `accounts` (`/me/account` page, `hasPassword`, `REASON_CODES`) and, for its
e2e only, on `contact-reveal` and `moderation` (the test creates the rows through their endpoints).

## Goal

A user, talent or client, deletes their own account from the settings page after confirming with their
password (or a typed confirmation for Google-only accounts). The `User` row and everything personal
disappear at once; audit rows keep working without a person behind them. Done = the PIPA promise in the
privacy policy ("delete at `/me/account`") is true, the Playwright suite cleans up the users it creates,
and the last tech-debt rows about auth are closed.

## User stories

- As a talent who found a job, I want to delete my account and profile in one step so that my contact
  details and visa status stop existing on the site.
- As a parent who no longer needs a tutor, I want to delete my client account without an email exchange.
- As the site, I want reports and reveal logs to survive anonymised so that moderation history is not
  erased by the person who was reported or who abused reveals.
- As an admin, I must not be able to delete the admin account by accident from the same page.

## API contract

| Method and route | Auth | Request schema        | Response schema | Errors                                                                                                                                                                                                                                    |
| ---------------- | ---- | --------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DELETE /v1/me`  | user | `DeleteAccountSchema` | 204             | `VALIDATION_FAILED`; `FORBIDDEN` + reason `WRONG_PASSWORD` or `ADMIN_ACCOUNT` (`REASON_CODES`, `accounts`). Default IP throttler only: the caller already holds a valid token, and the Playwright teardown deletes many users from one IP |

Handler in the existing `modules/auth/` (`me.controller.ts` if `auth.controller.ts` gets crowded). A
`DELETE` with a JSON body is fine here: Express parses it and `openapi-fetch` sends it; the browser never
calls the API directly (ADR 0019), so proxy quirks do not apply.
Schema in `packages/shared/src/auth/account.schema.ts`:

- `DeleteAccountSchema { password: PasswordSchema.optional(), confirmation: z.literal('DELETE') }`.
  The literal is typed by the user in every case (prevents a one-tap mistake); the password is required
  by the service when `passwordHash` is set and ignored otherwise.
- `DELETE_CONFIRMATION = 'DELETE'` exported for the form label ("Type DELETE to confirm"; the word is
  not translated so the schema stays locale-free; the label explains it in each locale).

Service rules (`AccountService.deleteAccount(userId, input)`):

1. Load `id, passwordHash, roles`. `ADMIN` in roles → `FORBIDDEN` with `ADMIN_ACCOUNT` (admins are
   demoted by hand first, ADR 0018).
2. `passwordHash` set → `password` required (`VALIDATION_FAILED` when absent) and must verify with
   argon2 → else `FORBIDDEN` with `WRONG_PASSWORD`. Google-only accounts skip this step.
3. `prisma.user.delete({ where: { id } })`. Cascades remove `TalentProfile` and its children
   (`TalentSkill`, `TalentLanguage`, `PortfolioLink`, `ContactMethod`, its `ContactReveal`, `Report`
   and `ModerationAction` rows), `AuthIdentity`, `RefreshToken`, `VerificationToken`, `Consent`.
   `SetNull` keeps the user's own `Report` (as reporter), `ContactReveal` (as viewer) and
   `ModerationAction` (as admin) rows. No extra statements are needed; the unit test asserts only the
   single `delete` call and the e2e asserts the cascade results.
4. Log `account deleted` with the requestId only. Nothing about the user remains to log.

The access token stays cryptographically valid until its TTL (15 min) because the guard does not hit the
database. Any request with it now fails inside the service with `NOT_FOUND` on the user; the web clears
both cookies at once, so this only matters for a stolen token (row in `docs/tech-debt.md`).

## Data changes

None structural: every relation already has the right `onDelete` (ADR 0018, `init_mvp_schema`).
Seed: unchanged. Playwright gains a teardown that deletes the users it registers (`e2e/helpers/api.ts`:
`deleteAccount(request, token, password)`), closing the tech-debt row about `e2e-web-*` users.

## UI

Namespace `account` (owned by `accounts`) gains a `delete` group. Action `deleteAccount(input)` in
`src/actions/account.ts`: validate, call `DELETE /v1/me`, on success `clearSession()` and
`redirect('/?deleted=1')`.

| Route                | Kind                                               | States                                                                                                                                                                                                                                                                                               |
| -------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/me/account`        | existing page; "Danger zone" section at the bottom | one destructive-variant button "Delete account" linking to `/me/account/delete`                                                                                                                                                                                                                      |
| `/me/account/delete` | Server page (session required) + Client form       | explanation list (what is deleted, what stays anonymised), password field (only when the account has a password, known from `AuthUserSchema.hasPassword`, `accounts`), "Type DELETE" field, submit disabled until both valid, submitting, `WRONG_PASSWORD`, `ADMIN_ACCOUNT`, `RATE_LIMITED`, generic |
| `/`                  | home                                               | `?deleted=1` shows a dismissible banner "Your account was deleted" (Server Component reads `searchParams`)                                                                                                                                                                                           |

- Phone first: single column; the destructive button is full width and separated from other actions by a
  heading so it cannot be hit by mistake. Desktop: same card.
- Keys (`account.delete`): `title`, `button`, `intro`, `willDelete.title`, `willDelete.profile`,
  `willDelete.contacts`, `willDelete.consents`, `willDelete.sessions`, `willKeep.title`,
  `willKeep.reports`, `willKeep.reveals`, `password`, `confirmation` ("Type {word} to confirm"),
  `confirmationMismatch`, `submit`, `wrongPassword`, `adminAccount`, `done`. (`home`): `deletedBanner`,
  `dismiss`.

## Acceptance criteria

1. Given a talent with a published profile and a password, when they type the password and `DELETE` and
   submit, then the API answers 204, the browser lands on `/` with the deleted banner, the session
   cookies are gone, `/t/<slug>` is 404, and `GET /v1/me` with the old token answers 404. [e2e]
2. Given a wrong password, then 403 with `details[0].code = 'WRONG_PASSWORD'` and the form shows the
   message; the account still exists.
3. Given `confirmation: 'delete'` (lower-case) or missing, then 400 on the API and the submit button is
   disabled in the form (same schema).
4. Given a Google-only account (`passwordHash` null), then no password field renders and the deletion
   succeeds with the confirmation alone (service unit test).
5. Given the seeded admin, then 403 `ADMIN_ACCOUNT` and the page explains it.
6. Given a client who filed a report and revealed contacts, when they delete their account, then the
   `Report` row has `reporterUserId = null` and the `ContactReveal` row has `viewerUserId = null`, both
   still present (API e2e).
7. Given a talent who was reported and hidden, when they delete their account, then their `Report` and
   `ModerationAction` rows are gone with the profile (API e2e).
8. Given a request without a token, then 401 `UNAUTHENTICATED` and nothing is deleted.
9. The page renders in en, ko and ru; the explanation and both fields fit 390 px; the destructive button
   is at least 44 px high.
10. Logs for a deletion contain the requestId and the phrase only, no id of the deleted user, no email
    (`account.service.spec.ts` spies on `Logger.prototype` and asserts the arguments).
11. The Playwright suite leaves no `e2e-web-*` users behind (teardown asserts `DELETE /v1/me` 204).

Tests: `packages/shared/src/auth/account.schema.test.ts`,
`apps/api/src/modules/auth/account.service.spec.ts`, `apps/api/test/account-deletion.e2e-spec.ts`
(401 without token, cascade and SetNull checks), `apps/web/e2e/account-deletion.spec.ts`.

## Out of scope

- Grace period or soft delete with restore: a `deletionRequestedAt` column and a daily job; PIPA allows
  immediate deletion and the owner chose it (ADR 0018).
- Deleting a talent profile while keeping the account: `DELETE /v1/me/talent-profile`, trivial later.
- Admin-initiated deletion and legal-hold exceptions: admin module (`moderation` out of scope).
- Data export (PIPA right of access): `GET /v1/me/export` returning JSON of the user's rows.
- Email confirmation of deletion: `MailPort` once notifications exist.

## Open questions

None.
