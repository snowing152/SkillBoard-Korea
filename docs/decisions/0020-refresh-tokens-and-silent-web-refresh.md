# 0020. Refresh tokens: returned in the body, web keeps them in a second httpOnly cookie, silent refresh in the proxy

Date: 2026-10-14 · Status: Accepted (rotation bullet amended by 0024: expiry revokes nothing, `rotatedAt` separates rotation from revocation) · Refines 0009 and 0019

## Context

ADR 0009 said the web receives the refresh token as a cookie scoped to `/auth/refresh`. ADR 0019 then
decided that the browser never talks to the API: the Next.js server calls it and keeps the access token in
its own httpOnly cookie. A cookie set by the API therefore never reaches the browser, and Server
Components cannot set cookies at all. The accounts spec needs one agreed mechanism for web and mobile.

## Decision

- **API**: `POST /v1/auth/login`, `/register`, `/exchange` and `/refresh` return
  `{ accessToken, expiresInSeconds, refreshToken, refreshExpiresAt, user }` to every client. The API sets
  no cookies. Refresh tokens are opaque 256-bit random strings; the DB stores `sha256(token + pepper)`
  with `JWT_REFRESH_PEPPER` from env (separate from the access secret, ADR 0018).
- **Rotation**: `/refresh` revokes the presented token and issues a new pair. A token revoked less than
  `REFRESH_GRACE_SECONDS` (default 30) ago is a **concurrent refresh**, not a replay: several requests
  of one browser can expire together (parallel tabs, RSC prefetches), each presenting the same token;
  the service then issues a fresh pair as well and revokes nothing (the orphaned pair expires normally or
  dies with `logout all`). A token revoked earlier than that, or expired, means theft or a replay: the
  service revokes every refresh token of that user and answers `UNAUTHENTICATED` (ADR 0009 said
  "family"; without a family column, "all tokens of the user" is the simpler and stricter equivalent).
- **Web**: the Next.js server stores the refresh token in `skillboard_refresh` (`httpOnly; SameSite=Lax;
Secure` in production; path `/`; max-age = refresh TTL) next to the existing access cookie, whose
  max-age equals the access TTL so it simply disappears when the token expires. `src/proxy.ts` (the
  Next 16 middleware) runs **before** the next-intl middleware: when the request has no access cookie
  but a refresh cookie, and the path is not `/auth/callback`, it calls `/v1/auth/refresh`; on success
  it writes the new access token into `request.cookies` (so the forwarded request, and therefore the
  Server Components of this very render, see it), then calls the intl middleware and sets both cookies
  on its response; on failure it clears the refresh cookie and continues signed-out. Refresh therefore
  happens about once per access TTL per user, in one place, and pages never see an expired session.
- **Mobile**: stores both tokens in secure storage and calls `/v1/auth/refresh` itself on a 401.

## Consequences

One token flow for every client and no cookie logic in the API. The proxy performs a network call on at
most one request per 15 minutes per signed-in user; the API host sleeping (ADR 0013) makes that request
slow, which the "waking up" state already covers. Logout must call `/v1/auth/logout` so the refresh token
is revoked server-side, not just dropped from the cookie.
