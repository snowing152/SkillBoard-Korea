// `pnpm check:ci`: the "check" job of .github/workflows/ci.yml, run locally.
// Why: `pnpm check` can pass on a dev machine because local dotenv files and a warm Turborepo cache hide
// missing env declarations (see docs/pitfalls.md). This runs the same steps with a clean env, CI=true
// and no cache. Keep the values below equal to the workflow-level `env:` in ci.yml.
import { spawnSync } from 'node:child_process';

const env = {
  // Only what a shell needs; nothing from the developer's environment leaks in.
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  CI: 'true',
  TURBO_FORCE: 'true', // ignore the local cache, as a fresh CI runner has none
  DOTENV_CONFIG_PATH: '/dev/null', // dotenv/config must not load the local API env file
  DATABASE_URL: 'postgresql://skillboard:skillboard@localhost:5432/skillboard',
  JWT_ACCESS_SECRET: 'ci-only-secret-for-e2e-runs-0123456789abcdef',
  JWT_REFRESH_PEPPER: 'ci-only-refresh-pepper-for-e2e-runs-0123456789',
};

const steps = [
  ['pnpm', ['check']],
  ['pnpm', ['build']],
  ['pnpm', ['api-client:generate']],
  [
    'git',
    ['diff', '--exit-code', '--', 'apps/api/openapi.json', 'packages/api-client/src/schema.ts'],
  ],
];

for (const [cmd, args] of steps) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { env, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\ncheck:ci failed at: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}
console.log('\ncheck:ci passed (API e2e and Playwright are not included; they need Docker).');
