# Accounts and auth: sign-up, Google, email verification, refresh, password reset, settings

Status: Implemented (hardened by ADR 0024) · Model: Sonnet (Opus reviews the token rotation and the Google callback) · ADRs: 0009,
0013, 0017, 0018, 0019, 0020 · Branch: `feat/accounts` · Order: 2 of 6 · Depends on `legal`
(`ConsentsService`, `LEGAL_VERSIONS`).

## Goal

A talent or a client (company or private person, no company fields anywhere) creates an account with
email and password or with Google, picks a role, accepts the terms and privacy policy, verifies the email,
stays signed in for 30 days thanks to refresh tokens, and can reset a forgotten password and change
display name, UI language or password. Done = the Phase D sign-in keeps working, the four tech-debt rows
about auth are closed, and nothing in the browser ever holds a token.

## User stories

- As a parent looking for a Russian tutor, I want to sign up as a client with Google in two taps so that I
  can contact a tutor without a form about a company I do not have.
- As a talent, I want to sign up with email and password and verify my email so that clients trust that my
  contact details reach a real person.
- As a signed-in user, I want to stay signed in on my phone for weeks so that I do not retype my password.
- As a user who forgot the password, I want a reset link by email so that I can get back in.
- As a user, I want to change my display name, language and password on one settings page.
- As the site, I want unverified accounts to be unable to reveal contacts or file reports so that
  throwaway accounts cannot harvest personal data (the `contact-reveal` and `moderation` specs enforce it).

## API contract

All routes are in `modules/auth/` unless noted, `@Public()` unless marked `user`, throttled 10/min per IP
(existing controller decorator). Stricter per-route limits in the last column.

| Method and route                       | Auth   | Request schema               | Response schema                         | Errors and limits                                                                                                                                                                    |
| -------------------------------------- | ------ | ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /v1/auth/register`               | public | `RegisterSchema` (extended)  | `AuthSessionSchema` (extended)          | `VALIDATION_FAILED`, `CONFLICT`; sends the verification email                                                                                                                        |
| `POST /v1/auth/login`                  | public | `LoginSchema`                | `AuthSessionSchema`                     | `UNAUTHENTICATED` (one message for all causes)                                                                                                                                       |
| `POST /v1/auth/refresh`                | public | `RefreshSchema`              | `AuthSessionSchema`                     | `UNAUTHENTICATED` (expired, revoked or unknown → plain 401; a rotated token presented after the grace window → all tokens of that user revoked, ADR 0020/0024)                       |
| `POST /v1/auth/logout`                 | public | `LogoutSchema`               | 204                                     | revokes the given refresh token (no access token needed: it is its own credential); `all: true` needs the access token and revokes every token of the user                           |
| `POST /v1/auth/verify-email/request`   | user   | –                            | 204                                     | 3 per 15 min per IP; 204 even if already verified                                                                                                                                    |
| `POST /v1/auth/verify-email/confirm`   | public | `TokenSchema`                | 204                                     | `NOT_FOUND` (unknown, used or expired token)                                                                                                                                         |
| `POST /v1/auth/password-reset/request` | public | `PasswordResetRequestSchema` | 204                                     | 3 per 15 min per IP; always 204 (no account enumeration)                                                                                                                             |
| `POST /v1/auth/password-reset/confirm` | public | `PasswordResetConfirmSchema` | 204                                     | `NOT_FOUND` (bad token); revokes all refresh tokens                                                                                                                                  |
| `GET /v1/auth/google`                  | public | `GoogleStartQuerySchema`     | 302 to Google                           | `NOT_FOUND` when Google env is unset                                                                                                                                                 |
| `GET /v1/auth/google/callback`         | public | Passport                     | 302 to `WEB_URL/<locale>/auth/callback` | on failure redirects with `?error=<OAUTH_CALLBACK_ERRORS>` instead of `?code=`                                                                                                       |
| `POST /v1/auth/google/complete`        | public | `GoogleCompleteSchema`       | `AuthSessionSchema`                     | `NOT_FOUND` (bad or expired signup token), `CONFLICT` (account exists); role step of ADR 0024                                                                                        |
| `POST /v1/auth/exchange`               | public | `ExchangeSchema`             | `AuthSessionSchema`                     | `NOT_FOUND` (code unknown, used or older than 60 s)                                                                                                                                  |
| `GET /v1/me`                           | user   | –                            | `AuthUserSchema`                        | `UNAUTHENTICATED`                                                                                                                                                                    |
| `PATCH /v1/me`                         | user   | `UpdateMeSchema`             | `AuthUserSchema`                        | `VALIDATION_FAILED`                                                                                                                                                                  |
| `POST /v1/me/password`                 | user   | `ChangePasswordSchema`       | 204                                     | `FORBIDDEN` (wrong current password, or Google-only account: `details[0].code` says which); revokes every other session (`refreshToken` in the body names the one to keep, ADR 0024) |

Schemas in `packages/shared/src/auth/` (extend `auth.schema.ts`; move tokens to `tokens.schema.ts`):

- `RegisterSchema` adds `locale: LocaleSchema.default('en')` (the sign-up form sends the current URL
  locale) and `acceptTerms: z.literal(true)` (one checkbox covers `SIGNUP_CONSENT_DOCUMENTS` from the
  `legal` spec). Role wording in the UI never says "company".
- `AuthUserSchema` adds `emailVerified: z.boolean()` and `hasPassword: z.boolean()` (`passwordHash` not
  null; drives the password section and the deletion form). `AuthSessionSchema` adds
  `refreshToken: z.string().max(200)` and `refreshExpiresAt: z.iso.datetime()` (ADR 0020).
- `OAUTH_CALLBACK_ERRORS = ['EMAIL_NOT_VERIFIED', 'OAUTH_FAILED'] as const` (`auth/oauth.ts`): the only
  values the callback may put in `?error=`; the web maps anything else to `OAUTH_FAILED`.
- `RefreshSchema { refreshToken: z.string().min(20).max(200) }`; `LogoutSchema
{ refreshToken?: same, all: z.boolean().default(false) }`; `TokenSchema { token: z.string().min(20).max(200) }`;
  `PasswordResetRequestSchema { email }`; `PasswordResetConfirmSchema { token, password }`;
  `ExchangeSchema { code: z.string().min(20).max(200) }`; `UpdateMeSchema { displayName?, locale? }`
  (same limits as register); `ChangePasswordSchema { currentPassword, newPassword }` (both
  `PasswordSchema`, `newPassword !== currentPassword` via `refine`); `GoogleStartQuerySchema
{ role: z.enum(SIGNUP_ROLES), locale: LocaleSchema, acceptTerms: z.literal('true'), next?: SafePathSchema }`.
- `SafePathSchema` (`auth/safe-path.ts`): `z.string().max(300).regex(/^\/(?!\/)[^\s]*$/)`, a relative
  path only, used by every `next` parameter so sign-in cannot redirect to another site.
- Reason codes (`packages/shared/src/api/reason-codes.ts`, owned by this spec, used by the later ones):
  `REASON_CODES = ['EMAIL_NOT_VERIFIED', 'WRONG_PASSWORD', 'NO_PASSWORD_SET', 'OWN_PROFILE',
'ADMIN_ACCOUNT'] as const`, `ReasonCodeSchema`. The error `code` set of ADR 0017 stays fixed; a reason
  travels as `details: [{ path: [], message: <same as error.message>, code: <reason> }]`. `ApiError`
  gets an optional fourth argument `reason` that builds that detail. The web adds
  `reason?: ReasonCode` to `ActionFailure` in `lib/api-errors.ts`, derived from `details[0].code` when
  it parses as `ReasonCodeSchema`; forms switch on it.

Service rules (`AuthService`, split `TokensService` for refresh/verification tokens when `auth.service.ts`
passes 300 lines):

- Refresh token: 32 random bytes base64url; stored `sha256(token + JWT_REFRESH_PEPPER)`, TTL
  `REFRESH_TTL_DAYS` (default 30), `userAgent` truncated to 200. Rotation and reuse handling per
  ADR 0020. `register`, `login`, `exchange` and `refresh` all return a fresh pair.
- Verification and reset tokens: 32 random bytes, stored hashed the same way in `VerificationToken` with
  `purpose`; TTL 24 h for `EMAIL_VERIFY`, 1 h for `PASSWORD_RESET`, 60 s for `OAUTH_EXCHANGE`. Issuing a
  new token marks older unused tokens of the same purpose as used. Confirming sets `usedAt` in the same
  transaction as the effect (idempotent under retries).
- Links in emails: `${WEB_URL}/${locale}/verify-email?token=…` and `${WEB_URL}/${locale}/reset-password?token=…`.
- Google (`@nestjs/passport` + `passport-google-oauth20`, scopes `email profile`): `GET /v1/auth/google`
  validates the query, signs it into a `state` JWT (payload `{ purpose: 'oauth_state', role, locale,
next, nonce }`, 10 min, `JWT_ACCESS_SECRET`; the access guard rejects it because `sub` is missing) and
  redirects. The callback verifies `state`, then: existing `AuthIdentity` → that user; else a user with the
  same lower-cased email and `emailVerifiedAt` set → link identity (ADR 0009), and in the same
  transaction clear its `passwordHash` and revoke all its sessions (pre-hijack: whoever registered the
  address first loses access; the owner sets a password by reset); same email but unverified
  → redirect with `error=EMAIL_NOT_VERIFIED` (prevents takeover); Google does not say `email_verified` →
  `error=OAUTH_FAILED`, nothing created or parked (no squatting). For an existing user, create an
  `OAUTH_EXCHANGE` token and redirect to `${WEB_URL}/${locale}/auth/callback?code=…&next=…`. Amended by
  ADR 0024: the start route also sets an `HttpOnly` nonce cookie that the callback must match with the
  `state` nonce (login CSRF). Amended by ADR 0025: nobody exists yet → nothing is created, whatever the
  start query says (a link carries no consent): the callback redirects with an opaque single-use
  `signup=…` token instead of `code` (the identity is parked in `OAuthSignup`) plus `role` when the start
  query had one; the web keeps the token in an `HttpOnly` cookie, and `/sign-up/google` (role preselected)
  asks for role and consent before `POST /v1/auth/google/complete` creates the user (`emailVerifiedAt =
now()`, `passwordHash = null`, sign-up consents).
- `login` of an unverified user succeeds (they must be able to reach "resend"); gated actions check
  `emailVerifiedAt` themselves (`contact-reveal`, `moderation`). A profile can be created, edited and
  set to `PUBLISHED` without verification, but it is not publicly visible until the owner's email is
  verified (`PUBLICLY_VISIBLE` in `docs/domain.md`, introduced by `search`; this spec adds the
  `user.emailVerifiedAt` part if `search` has not shipped yet). Verifying the email makes it live with
  no further action.
- Re-consent (`legal`): `AuthUserSchema.pendingConsents` lists documents whose current version the user
  has not accepted. The sign-in and `/auth/callback` flows redirect to `/consent?next=<target>` when the
  list is not empty; the `/me/*` layout does the same for sessions that were already open.
- Mail: `apps/api/src/common/mail/mail.port.ts` (`MailPort.send({ to, subject, text, html })`),
  `resend.adapter.ts` (plain `fetch` to `https://api.resend.com/emails`, no SDK: avoids the ESM pitfall)
  and `console.adapter.ts` (development and test only: prints subject and link; env validation rejects
  `EMAIL_PROVIDER=console` when `NODE_ENV=production`, so rule 11 holds where it matters). Subjects and
  bodies for the two emails in `mail/templates.ts` as `Record<Locale, …>`; the user's `locale` picks one.
- Env (`EnvSchema` + `.env.example`): `JWT_REFRESH_PEPPER` (min 32), `REFRESH_TTL_DAYS` (1–90, default
  30), `REFRESH_GRACE_SECONDS` (0–120, default 30, ADR 0020), `EMAIL_PROVIDER` (`console` | `resend`, default `console`), `RESEND_API_KEY` (required when
  `resend`), `EMAIL_FROM` (default `SkillBoard Korea <noreply@localhost>`), `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (all three optional; Google routes answer `NOT_FOUND`
  while any is missing). Web: `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` (`'true'` | `'false'`, default `'false'`)
  decides whether the button renders.
- Logging: `userId`, `purpose` and outcome only. Never the email, token, code or `state`.

## Data changes

`TokenPurpose` enum gains `OAUTH_EXCHANGE`: migration `add_oauth_exchange_token_purpose`. No other
column. Seed: unchanged (all seed users are verified; `client@skillboard.local` is the verified client
for e2e). Deletion: `RefreshToken`, `VerificationToken`, `AuthIdentity` already cascade (ADR 0018).

## UI

New namespace `account`; `auth` grows. Server Actions in `src/actions/auth.ts` and `src/actions/account.ts`.

| Route                | Kind                                                         | States                                                                                                                                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sign-up`           | Server page + Client form `components/auth/sign-up-form.tsx` | role choice (two radio cards: "I offer my skills" / "I am looking for someone"), consent checkbox with links to `/legal/*`, Google button (if enabled; passes only the role, the consent is given on `/sign-up/google`), submitting, `CONFLICT` → `auth.errors.emailTaken`, success → `/verify-email/sent` |
| `/sign-in`           | existing form + "Continue with Google" + "Forgot password?"  | `?next=` (validated with `SafePathSchema`) is honoured after success; default `/me/talent-profile` for TALENT, `/talents` for CLIENT                                                                                                                                                                       |
| `/verify-email/sent` | Server page                                                  | explanation, "Resend" button (action → `verify-email/request`; disabled 60 s after click; `RATE_LIMITED` message)                                                                                                                                                                                          |
| `/verify-email`      | Server page reads `?token`, Client confirm component         | confirming, success (link to sign-in or `/me/talent-profile` when a session exists), `NOT_FOUND` → "link expired, request a new one"                                                                                                                                                                       |
| `/forgot-password`   | Server page + Client form                                    | submitting, always the same success text ("If an account exists, we sent a link")                                                                                                                                                                                                                          |
| `/reset-password`    | Server page reads `?token` + Client form                     | new password twice (client-side equality `refine`), success → `/sign-in`, `NOT_FOUND` → expired                                                                                                                                                                                                            |
| `/auth/callback`     | Route Handler `route.ts`                                     | reads `code` (+ `next`), calls `POST /v1/auth/exchange`, sets both cookies, redirects; `?error=` → `/sign-in?error=<CODE>` which shows `auth.errors.<CODE>`                                                                                                                                                |
| `/me/account`        | Server page, session required; Client forms per section      | sections: profile (display name, language), email (verified badge or "Resend verification"), password (change, or "set a password" via reset email for Google-only users), consents (`legal`), danger zone (`account-deletion`)                                                                            |
| `/me/*` layout       | `app/[locale]/(main)/me/layout.tsx`                          | loads `GET /v1/me`; `pendingConsents` not empty → redirect to `/consent?next=`; unverified → `VerifyEmailBanner` with resend action on every `/me/*` page; on `/me/talent-profile` the banner reads "Verify your email to go live" (`auth.verify.goLive`) when a `PUBLISHED` profile exists                |

- Session (`src/lib/session.ts`): `setSession(session: AuthSession)` sets `skillboard_session` (max-age
  `expiresInSeconds`) and `skillboard_refresh` (max-age until `refreshExpiresAt`); `clearSession` clears
  both. `signOut` action calls `POST /v1/auth/logout` with the refresh cookie value before clearing.
- Silent refresh in `src/proxy.ts` per ADR 0020. `proxy` becomes `async (request) => {...}`: skip when
  the path starts with `/auth/callback` (any locale) or an access cookie exists or no refresh cookie
  exists; otherwise `refreshSession(refreshToken)` from `lib/refresh-session.ts` (plain `fetch` to
  `POST /v1/auth/refresh`, 5 s timeout) → on success `request.cookies.set(SESSION_COOKIE, accessToken)`
  so the forwarded request carries it, then `const response = intlMiddleware(request)` and
  `response.cookies.set(...)` for both cookies; on `UNAUTHENTICATED` delete the refresh cookie on the
  response; on a network error continue signed-out without touching cookies (the API may be waking up,
  ADR 0013). Unit test with a fake `fetch`: both cookies set on success, refresh cookie cleared on 401,
  callback path untouched.
- Navigation: nav shows "Sign up" next to "Sign in" when signed out and "Account" when signed in.
- Phone first: one column, radio cards full width, 44 px targets; Google button below the form with an
  "or" divider. Desktop: centred card, max 28 rem.
- Keys (`auth`): `signUp.title`, `signUp.roleTalent`, `signUp.roleTalentHint` ("Create a profile that
  clients can find"), `signUp.roleClient`, `signUp.roleClientHint` ("Hire a tutor, a freelancer or a
  team member"), `signUp.acceptTerms` (rich text with `<terms>`/`<privacy>` tags), `signUp.submit`,
  `signUp.haveAccount`, `google.continue`, `signIn.noAccount`, `signIn.forgot`, `verify.sentTitle`,
  `verify.sentBody`, `verify.resend`, `verify.resent`, `verify.successTitle`, `verify.expired`,
  `verify.bannerText`, `reset.requestTitle`, `reset.requestBody`, `reset.sent`, `reset.title`,
  `reset.newPassword`, `reset.repeatPassword`, `reset.mismatch`, `reset.success`,
  `errors.emailTaken`, `errors.EMAIL_NOT_VERIFIED`, `errors.OAUTH_FAILED`. (`account`): `title`,
  `displayName`, `language`, `save`, `saved`, `email.title`, `email.verified`, `email.unverified`,
  `password.title`, `password.current`, `password.new`, `password.change`, `password.changed`,
  `password.wrong`, `password.googleOnly`, `password.sendSetLink`, `consents.title`, `consents.empty`.

## Acceptance criteria

1. Given the sign-up form, when the consent box is unchecked, then the field error shows and no request is
   sent; when checked and valid, then `POST /v1/auth/register` creates the user with `roles=[role]`,
   writes `TERMS` and `PRIVACY` consents with `LEGAL_VERSIONS`, sends one verification email and the
   browser lands on `/verify-email/sent`. [e2e]
2. Given a registered but unverified user, when they sign in, then they reach `/me/talent-profile` and see
   the verify banner; `GET /v1/me` returns `emailVerified: false`. Given they publish a profile, then
   `/t/<slug>` is 404 and `GET /v1/talents` omits it until `verify-email/confirm` succeeds, after which
   both show it with no further request (API e2e). [e2e]
3. Given a valid verification token, when `POST /v1/auth/verify-email/confirm` is called, then
   `emailVerifiedAt` is set and a second call answers 404; given an expired one, 404 (unit test with a
   frozen clock).
4. Given a session, when the access cookie is absent and the refresh cookie present, then the next page
   request is served signed-in and both cookies are set again (proxy unit test + e2e: delete the access
   cookie via `context.clearCookies({ name })`, reload `/me/talent-profile`, still signed in). [e2e]
5. Given a refresh token rotated more than `REFRESH_GRACE_SECONDS` ago, when it is presented again,
   then the API answers 401 and every refresh token of that user has `revokedAt` set; given one rotated
   5 s ago, then a new pair is issued and nothing else is revoked (unit tests with a frozen clock).
6. Given `POST /v1/auth/password-reset/request` with an unknown email, then 204 and no email; with a known
   email, 204 and one email; a fourth request in 15 min from the same IP answers 429.
7. Given a valid reset token and a new password, then login works with the new password, fails with the
   old one, and all refresh tokens of the user are revoked.
8. Given Google env is set and a state with `role=CLIENT`, when a new Google user completes the callback,
   then no user exists yet, the browser receives a `signup` token and `role=CLIENT`, and `/sign-up/google`
   shows CLIENT preselected with the consent box unticked; after ticking it and submitting, a user with
   `roles=['CLIENT']`, a linked `AuthIdentity`, `emailVerifiedAt` set and both consents exists (ADR 0025).
   (Service unit test with a fake profile; the redirect dance itself is tested manually.)
9. Given an existing unverified email/password account, when a Google sign-in with the same email happens,
   then no identity is linked and the web shows `auth.errors.EMAIL_NOT_VERIFIED`.
10. Given `?next=//evil.example`, when sign-in succeeds, then the user is sent to the role default, not to
    the external host (unit test on `SafePathSchema`).
11. Given `PATCH /v1/me` with `locale: 'ko'`, then `GET /v1/me` returns it and the action redirects to
    `/me/account` under the `ko` locale (the URL prefix is the locale; sign-in also redirects to the
    user's stored locale when it differs from the current one).
12. Given a Google-only account, when it calls `POST /v1/me/password`, then 403 with
    `details[0].code = 'NO_PASSWORD_SET'` and the page shows the "set a password" path.
13. Every new page renders in en, ko and ru with no missing keys and fits 390 px.
14. Logs of a full sign-up, verification and reset run contain no email address, token, code or password
    (`auth.service.spec.ts` spies on `Logger.prototype.log|warn|error` and asserts that no call argument
    contains the test email, token or password); `passwordHash` and token hashes never appear in any
    response (output schemas).

Tests: `packages/shared/src/auth/*.test.ts`, `apps/api/src/modules/auth/auth.service.spec.ts`,
`tokens.service.spec.ts`, `apps/api/src/common/mail/*.spec.ts`, `apps/api/test/auth.e2e-spec.ts`
(register → login → refresh → reuse 401 → logout), `apps/web/src/lib/refresh-session.test.ts`,
`apps/web/e2e/accounts.spec.ts`.

## Out of scope

- Account deletion: `account-deletion` spec (adds the danger zone to `/me/account`).
- Changing the email address, 2FA, device list, Apple or Kakao login (`AuthProvider` enum + one strategy
  each), magic links: post-MVP (`docs/roadmap.md`).
- Admin role assignment: by hand in the database (ADR 0018).
- Re-consent on a new legal version: `legal` spec plug point.
- Per-user (not per-IP) throttling: a `ThrottlerGuard` subclass with `getTracker` reading `req.user`,
  when abuse appears.

## Open questions

None.
