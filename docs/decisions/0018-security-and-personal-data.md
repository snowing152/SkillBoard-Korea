# 0018. Security and personal data (PIPA)

Date: 2026-10-14 · Status: Accepted

## Context
Users are in Korea; Korea's PIPA applies. Profiles contain contact details and self-declared visa status
(sensitive in practice). Budget is zero, so controls must be cheap and built in.

## Decision
**Transport & input**: HTTPS only (hosts provide it). `helmet` on the API. CORS allowlist from `CORS_ORIGINS`
env (web URL + `localhost` in dev). All input validated by Zod (ADR 0014); string lengths capped everywhere;
URLs validated as `http(s)` only. Rate limiting with `@nestjs/throttler`: global 100 req/min per IP, stricter
on `/auth/*` (10/min) and `POST /contact-reveals` (30/hour per user).

**Secrets**: only via env, validated by a Zod schema at boot (`apps/api/src/common/config/env.ts`,
`apps/web/src/env.ts`); boot fails loudly on a missing key. `.env*` is git-ignored and edit-blocked by a hook.
Access-token secret and refresh-token pepper are separate values.

**Personal data (PIPA, data minimisation)**:
- Collect only what the product needs: email, display name, profile content the user writes. No phone number,
  no passport/ARC number, no real-name verification in MVP. Visa type is optional and self-declared, with the
  disclaimer that users are responsible for working within their visa (link to HiKorea).
- Explicit consents recorded (`Consent` table) for terms, privacy policy, visa disclaimer, each with a version.
- Contact methods are shown only after an authenticated click, and each reveal is logged (`ContactReveal`).
- Account deletion is self-service and immediate: hard delete with cascades; audit rows keep `SetNull` refs.
  Deletion endpoint also revokes all refresh tokens.
- Overseas storage (Neon Singapore, Vercel, Resend) is disclosed in the privacy policy.
- Logs never contain emails, tokens, or request bodies; `requestId` correlates instead.

**Moderation**: anyone logged in can report; admins hide (not delete) profiles; hidden profiles return 404 to
the public and a banner to the owner.

## Consequences
A short security checklist goes into the `review` skill (Phase C). Items left for later: 2FA, device list,
automated abuse scoring, DPIA-style review before adding chat.
