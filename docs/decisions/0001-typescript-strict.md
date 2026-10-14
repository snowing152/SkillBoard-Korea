# 0001. TypeScript strict mode everywhere

Date: 2026-10-14 · Status: Accepted

## Context
Most code will be written by Sonnet/Haiku. The cheapest, fastest feedback they get is a type error.

## Decision
Every package uses `"strict": true` plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
`exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Base config lives in `packages/config/tsconfig.base.json`.
`any` is banned by ESLint (`@typescript-eslint/no-explicit-any: error`). `unknown` + narrowing instead.

## Consequences
Slightly more verbose code around optional values. In exchange, `pnpm typecheck` catches most agent mistakes
before any test runs. Fixed decision from the brief; not up for debate.
