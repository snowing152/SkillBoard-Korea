// PostToolUse hook for Edit|Write: formats the file with Prettier, then lints it with the package's
// ESLint config (type-aware). Remaining problems exit 2 so the agent sees them immediately.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, readInput, relativeToRoot, runNodeBin } = require('./lib.js');

const LINTABLE = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;

function findEslintConfigDir(absFile) {
  let dir = path.dirname(absFile);
  while (dir.startsWith(ROOT) && dir !== ROOT) {
    if (fs.existsSync(path.join(dir, 'eslint.config.mjs'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

const input = readInput();
const filePath = input.tool_input && input.tool_input.file_path;
const rel = relativeToRoot(filePath);
if (rel === null || /(^|\/)(node_modules|dist|\.next|\.turbo|coverage)\//.test(rel))
  process.exit(0);
const abs = path.join(ROOT, rel);
if (!fs.existsSync(abs)) process.exit(0);

const before = fs.readFileSync(abs, 'utf8');

// 1. Prettier (also validates syntax of JSON/YAML/Markdown). Ignored and unknown files are skipped.
const prettier = runNodeBin('prettier', [
  '--write',
  '--ignore-unknown',
  '--log-level',
  'warn',
  abs,
]);
if (prettier.missing) process.exit(0); // no node_modules yet; nothing to check with
if (prettier.status !== 0) {
  process.stderr.write(`Prettier could not format ${rel}:\n${prettier.stderr || prettier.stdout}`);
  process.exit(2);
}

// 2. ESLint, from the package that owns the file (flat config lookup starts at cwd).
if (LINTABLE.test(rel)) {
  const pkgDir = findEslintConfigDir(abs);
  if (pkgDir) {
    const eslint = runNodeBin(
      'eslint',
      ['--fix', '--max-warnings', '0', '--no-warn-ignored', abs],
      {
        cwd: pkgDir,
      },
    );
    if (eslint.missing) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `ESLint is not installed in ${path.relative(ROOT, pkgDir)}; run \`pnpm install\` so edits get linted.`,
          },
        }),
      );
      process.exit(0);
    }
    if (eslint.status !== 0) {
      process.stderr.write(
        `ESLint failed for ${rel}. Fix these before continuing:\n${eslint.stdout}${eslint.stderr}`,
      );
      process.exit(2);
    }
  }
}

// 3. Tell the agent when the auto-fixes changed the file, so it re-reads before the next edit.
const after = fs.readFileSync(abs, 'utf8');
if (after !== before) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `${rel} was reformatted by Prettier/ESLint --fix. Re-read it before editing again.`,
      },
    }),
  );
}
process.exit(0);
