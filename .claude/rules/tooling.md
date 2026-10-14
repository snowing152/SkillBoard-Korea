---
paths:
  - 'package.json'
  - '**/package.json'
  - 'pnpm-workspace.yaml'
  - 'turbo.json'
  - 'packages/config/**'
  - '**/tsconfig*.json'
  - '**/eslint.config.mjs'
  - 'prettier.config.mjs'
  - '.github/**'
  - 'docker-compose.yml'
  - '**/next.config.ts'
  - '**/nest-cli.json'
---

# Tooling rules

- Versions are pinned exactly (no `^`). TypeScript stays on 5.9.x and Nest on 11.x until the peer ranges
  listed in `docs/tech-debt.md` move. A major bump needs a tech-debt row update and a green `pnpm check`.
- Add dependencies with `pnpm --filter <pkg> add <name>@<exact>`; never edit `pnpm-lock.yaml` by hand.
  If install reports an ignored build script, add it to `allowBuilds` in `pnpm-workspace.yaml` as
  `true` or `false` and say why in the commit.
- Shared presets live in `packages/config` (`tsconfig/*.json`, `eslint/*.mjs`); apps only extend them.
  Anything a preset imports is a dependency of `packages/config`, not of the app.
- A new lint rule must pass on the whole repo in the same PR, and replaces the matching prose in docs.
- `turbo.json` uses `tasks`; any package script named `build`, `typecheck`, `lint`, `test` or `dev` is
  picked up automatically. Keep `tsBuildInfoFile` inside `outDir` (pitfall).
- CI (`.github/workflows/ci.yml`) stays equal to `pnpm check` + build + e2e. No step agents cannot run
  locally.
- `db:*` scripts are human-triggered; hooks and CI never run `db:reset`.
