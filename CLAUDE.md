# Claude Code: SkillBoard Korea

Shared rules for every coding agent (project, commands, golden rules, layout, workflow):

@AGENTS.md

## Claude Code setup (committed in `.claude/`)

- **Hooks** (`.claude/settings.json` → `.claude/hooks/*.js`, plain Node): `guard-bash` and `guard-edit`
  block destructive commands and protected files; `format-lint` runs Prettier + ESLint on every edited file
  and returns the errors to you; `stop-check` runs `pnpm check` on the changed packages before you may stop;
  `session-start` prints branch, active spec and uncommitted files.
- **Path rules** in `.claude/rules/*.md` load only when you touch matching files (Prisma, messages,
  tests, docs, tooling, `.claude`).
- **Skills**: `/spec <slug>`, `/implement <slug>`, `/new-module <name>`, `/add-language <locale>`, `/review`.
- **Subagents** with fixed models: `reviewer` (Sonnet, read-only), `test-writer` (Sonnet),
  `i18n-checker` (Haiku, read-only). Delegate those jobs instead of doing them in the main session.
- Which model for which task: `docs/ai/model-routing.md`.

## Working style

- Plan briefly, then act in small verified steps. Start from the spec and the reference feature.
- Do not re-read large files you already read in this session; do not read generated files.
- A hook that blocks you is policy, not a bug: do what its message says or ask the owner.
- Stop and ask when a task grows beyond its spec, when a rule must change, or when an ADR conflicts with
  the request. Machine-specific notes go in `CLAUDE.local.md` (git-ignored), never here.
