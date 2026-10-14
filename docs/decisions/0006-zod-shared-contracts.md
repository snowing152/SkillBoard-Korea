# 0006. Zod schemas in packages/shared are the single contract

Date: 2026-10-14 · Status: Accepted

## Context
Web, API, and later mobile must agree on shapes. Duplicated types drift; agents duplicate eagerly.

## Decision
Every API request body, query, and response is a Zod 4 schema in `packages/shared/src/<domain>/*.schema.ts`,
exported with its inferred type (`export type X = z.infer<typeof XSchema>`). The API validates inputs and
outputs against them (ADR 0014); the web uses them for forms (react-hook-form + zodResolver).
`packages/shared` also holds constants (cities, visa types, locales) and pure helpers.
Hard rule: `packages/shared` imports only `zod`. No `node:*`, no DOM, no React, so Expo can import it.

## Consequences
Changing an API shape is one edit that breaks typecheck on every consumer, which is the point.
Prisma types never cross the API boundary; services map DB rows to shared output schemas.
