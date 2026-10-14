// PreToolUse hook for Bash: blocks destructive commands before they run.
// Policy, not style: everything here is irreversible or forbidden for agents (see AGENTS.md).
'use strict';

const { readInput, block } = require('./lib.js');

/** Paths that are safe to delete recursively (all regenerable). */
const DISPOSABLE =
  /^(\.\/)?(node_modules|dist|\.next|\.turbo|coverage|playwright-report|test-results)(\/|$)|^\/tmp\//;

/** [regex, reason]. The first match blocks. */
const RULES = [
  [
    /\b(prisma\s+migrate\s+reset|db:reset)\b/,
    'Blocked: `prisma migrate reset` / `pnpm db:reset` wipes the database and Prisma refuses it for agents anyway. Ask the owner to run it.',
  ],
  [
    /\bgit\s+push\b[^\n;&|]*\s(--force\b|-f\b|--force-with-lease|\+\w)/,
    'Blocked: force-pushing rewrites shared history. Push a new commit instead, or ask the owner.',
  ],
  [
    /\bgit\s+reset\s+--hard\b/,
    'Blocked: `git reset --hard` discards work. Use `git stash` or `git restore <file>`.',
  ],
  [
    /\bgit\s+clean\b/,
    'Blocked: `git clean` deletes untracked files. List them with `git status` and remove specific files.',
  ],
  [
    /\bgit\s+branch\s+-D\b/,
    'Blocked: `git branch -D` deletes unmerged work. Use `-d` or ask the owner.',
  ],
  [
    /\bdocker\s+(compose\s+down\b[^\n;&|]*\s(-v|--volumes)\b|volume\s+(rm|prune)|system\s+prune)/,
    'Blocked: this deletes Docker volumes (the local database). Use `pnpm db:down` without `-v`.',
  ],
  [
    /\b(DROP\s+(DATABASE|SCHEMA|TABLE)|TRUNCATE)\b/i,
    'Blocked: destructive SQL. Use a Prisma migration instead.',
  ],
  [/(^|[\s;&|])sudo\s/, 'Blocked: no sudo. Nothing in this repo needs root.'],
  [
    /(^|[\s;&|=])(\.\/)?([\w./-]*\/)?\.env(?!\.example\b)(\.\w+)?\b/,
    'Blocked: agents never touch .env files (ADR 0018). Edit .env.example and ask the owner to update their .env.',
  ],
  [
    /(>|>>|\btee\b|\bsed\s+-i|\bcp\b|\bmv\b|\brm\b|\bchmod\b)[^\n;&|]*\b(src\/generated|openapi\.json|api-client\/src\/schema\.ts|pnpm-lock\.yaml)\b/,
    'Blocked: that file is generated. Run `pnpm db:generate`, `pnpm api-client:generate` or `pnpm install` instead.',
  ],
  [
    /\b(vercel|wrangler|neonctl|render)\s+(deploy|--prod|publish)|\b(npm|pnpm)\s+publish\b/,
    'Blocked: deploys and publishes are done by the owner, not by agents.',
  ],
];

function checkRm(command) {
  // Every `rm` invocation with a recursive flag must target only disposable paths.
  const re = /(^|[\s;&|])rm\s+([^\n;&|]*)/g;
  let m;
  while ((m = re.exec(command)) !== null) {
    const tokens = m[2].split(/\s+/).filter(Boolean);
    const flags = tokens.filter((t) => t.startsWith('-'));
    const targets = tokens.filter((t) => !t.startsWith('-'));
    const recursive = flags.some((f) => /^-[a-zA-Z]*[rR]/.test(f) || f === '--recursive');
    if (!recursive) continue;
    if (targets.length === 0 || !targets.every((t) => DISPOSABLE.test(t))) {
      block(
        'Blocked: recursive `rm` is only allowed on node_modules, dist, .next, .turbo, coverage, test output or /tmp. Delete specific files instead, or ask the owner.',
      );
    }
  }
}

const input = readInput();
const command = String((input.tool_input && input.tool_input.command) || '');
if (!command) process.exit(0);

for (const [regex, reason] of RULES) {
  if (regex.test(command)) block(reason);
}
checkRm(command);
process.exit(0);
