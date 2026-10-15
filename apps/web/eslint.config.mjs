import { nextConfig } from '@skillboard/config/eslint/next.mjs';

// Design-system guards (ADR 0023, docs/design/README.md). Arbitrary layout values cannot be told apart
// from legitimate ones by a selector, so only the unambiguous cases are linted; review catches the rest.
const RAW_COLOR = String.raw`/(^|\s|:)(bg|text|border|ring|fill|stroke|outline|decoration)-(\[(#|rgb|hsl|oklch)|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d)/`;

const config = [
  ...nextConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/utils.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'cn',
              message: "Import cn from '@/lib/utils': only that one knows the design tokens.",
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=${RAW_COLOR}]`,
          message: 'Use a color token (bg-primary, text-muted-foreground …), not a raw color.',
        },
        {
          selector: `CallExpression[callee.name=/^(cn|cva)$/] Literal[value=${RAW_COLOR}]`,
          message: 'Use a color token (bg-primary, text-muted-foreground …), not a raw color.',
        },
      ],
    },
  },
];

export default config;
