// PreToolUse hook for Bash inside read-only subagents (reviewer, i18n-checker): only inspection
// commands are allowed. Everything else exits 2 with the reason.
'use strict';

const { readInput, block } = require('./lib.js');

const ALLOWED = [
  /^git (diff|log|show|status|branch|blame|ls-files|rev-parse|merge-base)\b/,
  /^pnpm (check|test|lint|typecheck|format:check)\b/,
  /^pnpm --filter \S+ (test|lint|typecheck)\b/,
  /^pnpm exec (vitest|jest|eslint|tsc|prettier --check)\b/,
  /^(cat|ls|head|tail|grep|rg|find|wc|sort|uniq|tr|cut|awk|diff|echo|printf|pwd|which|node --version|pnpm --version)\b/,
  /^sed (?!.*-i)/,
];

const input = readInput();
const command = String((input.tool_input && input.tool_input.command) || '').trim();
if (!command) process.exit(0);

const segments = command.split(/\s*(?:&&|\|\||;|\||\n)\s*/).filter(Boolean);
for (const raw of segments) {
  const segment = raw.replace(/^(\w+=\S+\s+)+/, ''); // leading VAR=value assignments
  const writesFile = />(?!>?\s*(\/dev\/null|&\d))/.test(segment);
  if (writesFile || !ALLOWED.some((re) => re.test(segment))) {
    block(
      `This subagent is read-only. "${segment}" is not an inspection command. Report the finding instead of changing files.`,
    );
  }
}
process.exit(0);
