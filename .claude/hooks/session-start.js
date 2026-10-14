// SessionStart hook: prints the working context (branch, spec, uncommitted files, environment hints).
// Plain stdout on exit 0 is added to the agent's context. Also puts pnpm on PATH when it is installed
// in the standard pnpm home but missing from the shell PATH (writes to CLAUDE_ENV_FILE).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, git, pnpmOnPath, findPnpmDir } = require('./lib.js');

const lines = [];
const branch = git(['branch', '--show-current']) || '(detached HEAD)';
lines.push(`Branch: ${branch}`);
lines.push(`Last commit: ${git(['log', '-1', '--format=%h %s']) || '(none)'}`);

// Convention: branch feat/<spec-slug> ↔ docs/specs/<spec-slug>.md (AGENTS.md "Workflow").
const slug = /^[a-z]+\/(.+)$/.exec(branch)?.[1];
const specsDir = path.join(ROOT, 'docs', 'specs');
const specs = fs.existsSync(specsDir)
  ? fs.readdirSync(specsDir).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  : [];
const spec = slug ? specs.find((f) => f === `${slug}.md` || f.includes(slug)) : undefined;
if (spec) lines.push(`Active spec: docs/specs/${spec}`);
else if (branch === 'main')
  lines.push(
    'Active spec: none. On main: pick a spec in docs/specs/ and branch as feat/<spec-slug>.',
  );
else
  lines.push(
    `Active spec: none found for branch "${branch}" (expected docs/specs/${slug ?? '<slug>'}.md).`,
  );

const status = git(['status', '--short']).split('\n').filter(Boolean);
if (status.length === 0) lines.push('Uncommitted files: none');
else {
  lines.push(`Uncommitted files (${status.length}):`);
  lines.push(...status.slice(0, 30).map((l) => `  ${l}`));
  if (status.length > 30) lines.push(`  … and ${status.length - 30} more`);
}

const hints = [];
if (!fs.existsSync(path.join(ROOT, 'node_modules')))
  hints.push('node_modules missing: run `pnpm install`.');
if (!fs.existsSync(path.join(ROOT, 'apps', 'api', '.env')))
  hints.push('apps/api/.env missing: ask the owner (agents never create .env files).');
if (!fs.existsSync(path.join(ROOT, 'apps', 'api', 'src', 'generated', 'prisma')))
  hints.push('Prisma client not generated: run `pnpm --filter @skillboard/api db:generate`.');

// pnpm on PATH? If not, find the standard pnpm home and export it for this session's shell.
if (!pnpmOnPath()) {
  const found = findPnpmDir();
  if (found && process.env.CLAUDE_ENV_FILE && process.platform !== 'win32') {
    fs.appendFileSync(process.env.CLAUDE_ENV_FILE, `export PATH="${found}:$PATH"\n`);
    hints.push(`pnpm was not on PATH; added ${found} to PATH for this session.`);
  } else {
    hints.push(
      'pnpm not found on PATH. Install it (https://pnpm.io/installation) or prefix commands with its bin directory.',
    );
  }
}
if (hints.length) lines.push('Environment:', ...hints.map((h) => `  - ${h}`));
lines.push(
  'Commands: pnpm check (before saying done) · pnpm dev · pnpm test:e2e. Rules: AGENTS.md.',
);
process.stdout.write(lines.join('\n') + '\n');
