# 0017. API conventions: errors, pagination, IDs, time

Date: 2026-10-14 · Status: Accepted

## Context

Agents copy whatever the first endpoint does. These must be decided once and enforced by shared schemas.

## Decision

**IDs**: UUID v7 (`@default(uuid(7))`, Postgres `uuid`), time-ordered so `ORDER BY id` is creation order and
cursors are trivial. Public profile URLs use a human `slug`, never the id.

**Errors**: every non-2xx response is

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Human readable, English", "details": [ ... ] }, "requestId": "..." }
```

`code` is a stable SCREAMING_SNAKE string from `packages/shared/src/errors.ts`
(`VALIDATION_FAILED` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409,
`RATE_LIMITED` 429, `INTERNAL` 500). The web maps `code` to a translated message; `message` is for logs.
A global Nest exception filter produces this shape; `details` carries Zod issues for 400.

**Pagination**: cursor-based for all lists.
Query: `?limit=20&cursor=<opaque>` (limit 1–50). Response: `{ "items": [...], "nextCursor": "..." | null }`.
Cursor is the last item's id (base64url), which works because ids are time-ordered. No `total` (expensive,
and infinite scroll on mobile does not need it).

**Time**: Postgres `timestamptz`, always UTC in the API (ISO 8601 with `Z`). Display in `Asia/Seoul` by default
via next-intl `timeZone`; never do timezone math in the API. Dates-only fields (none in MVP) would be `date`.

**Naming**: JSON keys camelCase; routes kebab-case plural nouns; query params camelCase.

## Consequences

Shared schemas `ErrorResponseSchema`, `paginatedSchema(itemSchema)`, `PaginationQuerySchema` exist once in
`packages/shared` and every endpoint reuses them.
