import nextVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from './base.mjs';

/** For apps/web: Next.js Core Web Vitals (react, react-hooks, @next/next) + the base rules on top. */
export function nextConfig(options) {
  return defineConfig([
    globalIgnores([
      '.next/**',
      'out/**',
      'next-env.d.ts',
      'public/sw.js',
      'playwright-report/**',
      'test-results/**',
    ]),
    // First, so the typed TypeScript parser from baseConfig wins for *.ts(x) files.
    ...nextVitals,
    ...baseConfig(options),
  ]);
}
