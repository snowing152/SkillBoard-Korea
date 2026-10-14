// Stop hook: runs `pnpm check` for the packages that changed (typecheck + lint + test via Turbo,
// plus Prettier on changed files). If anything fails, the agent is not allowed to stop and must fix it.
// Does not need Docker (unit tests mock Prisma, ADR 0010). Never calls db:reset.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, readInput, block, runNodeBin, git } = require('./lib.js');

const input = readInput();
if (input.stop_hook_active) process.exit(0); // already continuing because of this hook; avoid loops
if (process.env.SKILLBOARD_SKIP_STOP_CHECK) process.exit(0); // escape hatch for humans

function changedFiles() {
  const files = new Set();
  for (const line of git(['status', '--porcelain', '--untracked-files=all']).split('\n')) {
    if (!line.trim()) continue;
    const p = line.slice(3);
    files.add(p.includes(' -> ') ? p.split(' -> ')[1] : p);
  }
  const branch = git(['branch', '--show-current']);
  if (branch && branch !== 'main') {
    const base = git(['merge-base', 'main', 'HEAD']);
    if (base)
      for (const p of git(['diff', '--name-only', base, 'HEAD']).split('\n')) if (p) files.add(p);
  }
  return [...files];
}

function packageOf(file) {
  const m = /^(apps|packages)\/([^/]+)\//.exec(file);
  if (!m) return null;
  const pkgJson = path.join(ROOT, m[1], m[2], 'package.json');
  if (!fs.existsSync(pkgJson)) return null;
  return JSON.parse(fs.readFileSync(pkgJson, 'utf8')).name;
}

const files = changedFiles();
if (files.length === 0) process.exit(0);

const packages = [...new Set(files.map(packageOf).filter(Boolean))];
const tail = (s, n = 80) => s.split('\n').slice(-n).join('\n');

if (packages.length > 0) {
  const filters = packages.flatMap((p) => ['--filter', p]);
  const turbo = runNodeBin(
    'turbo',
    ['run', 'typecheck', 'lint', 'test', ...filters, '--output-logs=errors-only'],
    { needsPnpm: true },
  );
  if (turbo.missing)
    block(
      'node_modules is missing: run `pnpm install` before finishing, then re-run `pnpm check`.',
    );
  if (turbo.status !== 0) {
    block(
      `pnpm check failed for ${packages.join(', ')}. Fix it before finishing:\n${tail(turbo.stdout + turbo.stderr)}`,
    );
  }
}

const existing = files.filter((f) => fs.existsSync(path.join(ROOT, f)));
if (existing.length > 0) {
  const prettier = runNodeBin('prettier', ['--check', '--ignore-unknown', ...existing]);
  if (!prettier.missing && prettier.status !== 0) {
    block(
      `Prettier check failed. Run \`pnpm format\` (or fix the files) before finishing:\n${tail(prettier.stdout + prettier.stderr, 40)}`,
    );
  }
}
process.exit(0);
