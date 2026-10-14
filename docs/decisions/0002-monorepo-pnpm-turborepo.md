# 0002. Monorepo with pnpm workspaces and Turborepo

Date: 2026-10-14 · Status: Accepted

## Context

Web, API, future mobile, and shared schemas must share types and one CI. Agents need one set of rules.

## Decision

`pnpm-workspace.yaml` with `apps/*` and `packages/*`. Turborepo 2 (`turbo.json` with `tasks`) orchestrates
`build`, `typecheck`, `lint`, `test`, `dev` (`dev` is `cache: false, persistent: true`).
Root scripts: `pnpm check` = `turbo run typecheck lint test`, `pnpm dev`, `pnpm build`, `pnpm db:reset`.
Internal packages are **compiled** (`tsc` to `dist/`, ESM, `exports` → `dist/index.js` + `.d.ts`). The
original plan to consume TypeScript source directly was dropped in Phase B: Nest builds with plain `tsc` (no
bundler), which cannot compile another package's `.ts` files, and Jest cannot load ESM source. Turbo's
`dependsOn: ["^build"]` builds them first; `pnpm dev` runs `tsc --watch` for them so changes still propagate
within a second. `pnpm check` also runs `prettier --check`.

## Consequences

Turbo cache makes `pnpm check` fast on unchanged packages. Agents must run commands from the repo root.
Dependency install scripts are allow-listed in `pnpm-workspace.yaml` (`allowBuilds`, pnpm 12).
Vercel detects Turborepo and builds only `apps/web`.
