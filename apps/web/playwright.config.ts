import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001';

/**
 * Every e2e spec runs in two viewports: a phone first, then a desktop (ADR 0010).
 * Two servers: the API (needs Docker Postgres with the seed, and JWT_ACCESS_SECRET in apps/api/.env
 * or the environment) and the web app. Locally both reuse whatever `pnpm dev` already started; in CI
 * the production builds are started.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [
    // iPhone 14 viewport/UA/touch emulated in Chromium, so CI installs one browser only.
    { name: 'mobile', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: process.env.CI
        ? 'pnpm --filter @skillboard/api start'
        : 'pnpm --filter @skillboard/api dev',
      cwd: '../..',
      url: `${apiURL}/v1/health`,
      // Both viewports sign in many times from one IP and would trip the 10/min auth limit.
      env: { RATE_LIMIT_DISABLED: 'true' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: process.env.CI ? 'pnpm start' : 'pnpm dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
