---
paths:
  - '.claude/**'
  - 'AGENTS.md'
  - 'CLAUDE.md'
---

# .claude configuration rules

- Hooks are plain Node (CommonJS, no dependencies at load time) in `.claude/hooks/`, wired in
  `.claude/settings.json` in exec form (`"command": "node", "args": [...]`), with `onFailure: "block"` on
  policy hooks. Exit 2 blocks with stderr as the reason; exit 0 with JSON expresses `ask` or context.
- Every hook change is tested by making it fail once: pipe a JSON input, assert the exit code, and put the
  commands in the PR description.
- Hooks never need Docker, never run `db:reset`, never touch `.env*`, never depend on `pnpm` being on PATH
  (`lib.js` resolves tools from `node_modules` and finds pnpm itself).
- Skills (`.claude/skills/<name>/SKILL.md`) are procedures with an actionable task. Rules that always
  apply belong in `AGENTS.md` or `.claude/rules/`.
- Subagents (`.claude/agents/*.md`) pin `model:` for cost and list `tools:`; read-only agents get
  `readonly-bash.js` as a `PreToolUse` hook.
- Root `CLAUDE.md` stays under 150 lines and imports `AGENTS.md`; tool-agnostic rules go in `AGENTS.md`
  so other coding agents can read them.
- Permissions: allow only commands that are safe to repeat; deny secrets and deploys; destructive edits
  are the hooks' job (they give better messages).
