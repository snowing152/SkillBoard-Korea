// Shared helpers for the hooks in this folder. Plain CommonJS so they run on any OS with Node alone.
// Hook protocol (code.claude.com/docs/en/hooks): JSON on stdin, exit 0 = ok, exit 2 = block with
// stderr as the reason. Nothing here imports from node_modules at load time, so hooks work before
// `pnpm install`; tools (prettier, eslint, turbo) are resolved at call time.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const IS_WINDOWS = process.platform === 'win32';

/** Parse the hook input from stdin. Returns {} when stdin is empty or not JSON. */
function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Exit 2 with a reason on stderr: blocks the tool call (PreToolUse) or the stop (Stop). */
function block(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

/** Emit a PreToolUse decision as JSON (used for "ask", which exit codes cannot express). */
function decide(permissionDecision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/** Repo-relative POSIX path, or null when the file is outside the repo. */
function relativeToRoot(filePath) {
  if (!filePath) return null;
  const abs = path.resolve(ROOT, filePath);
  const rel = path.relative(ROOT, abs).split(path.sep).join('/');
  return rel.startsWith('..') ? null : rel;
}

/** True when `pnpm` runs from the current PATH. */
function pnpmOnPath() {
  return spawnSync('pnpm', ['--version'], { encoding: 'utf8', shell: IS_WINDOWS }).status === 0;
}

/** Directory holding the pnpm executable in the standard install locations, or null. */
function findPnpmDir() {
  const exe = IS_WINDOWS ? 'pnpm.cmd' : 'pnpm';
  const homes = [
    process.env.PNPM_HOME,
    path.join(os.homedir(), '.local', 'share', 'pnpm'),
    path.join(os.homedir(), 'Library', 'pnpm'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'pnpm'),
  ].filter(Boolean);
  return (
    homes.flatMap((d) => [d, path.join(d, 'bin')]).find((d) => fs.existsSync(path.join(d, exe))) ||
    null
  );
}

/**
 * Absolute path of a package's CLI entry. Reads the package's `bin` field, because `exports`
 * maps (ESLint, Prettier) hide `bin/*.js` from `require.resolve`.
 */
function resolveBin(packageName, cwd) {
  let pkgJsonPath;
  try {
    pkgJsonPath = require.resolve(`${packageName}/package.json`, { paths: [cwd] });
  } catch {
    // Package does not export package.json: resolve the main file and walk up to its package.json.
    let dir = path.dirname(require.resolve(packageName, { paths: [cwd] }));
    while (!fs.existsSync(path.join(dir, 'package.json')) && path.dirname(dir) !== dir)
      dir = path.dirname(dir);
    pkgJsonPath = path.join(dir, 'package.json');
  }
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin && pkg.bin[packageName];
  if (!bin) throw new Error(`${packageName} has no bin`);
  return path.join(path.dirname(pkgJsonPath), bin);
}

/**
 * Run a Node-based CLI (prettier, eslint, turbo) without relying on PATH.
 * options.cwd: where to resolve and run; options.needsPnpm: put pnpm on PATH (turbo needs it).
 */
function runNodeBin(packageName, args, options = {}) {
  const cwd = options.cwd || ROOT;
  let bin;
  try {
    bin = resolveBin(packageName, cwd);
  } catch {
    return { status: null, missing: true, stdout: '', stderr: `${packageName} is not installed` };
  }
  const env = { ...process.env, FORCE_COLOR: '0', TURBO_UI: '0', TURBO_TELEMETRY_DISABLED: '1' };
  if (options.needsPnpm && !pnpmOnPath()) {
    const dir = findPnpmDir();
    if (dir) env.PATH = `${dir}${path.delimiter}${env.PATH || ''}`;
  }
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: 'utf8',
    env,
    maxBuffer: 16 * 1024 * 1024,
  });
  return { status: result.status, missing: false, stdout: result.stdout, stderr: result.stderr };
}

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

module.exports = {
  ROOT,
  readInput,
  block,
  decide,
  relativeToRoot,
  runNodeBin,
  git,
  pnpmOnPath,
  findPnpmDir,
};
