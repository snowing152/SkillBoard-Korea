import { expect, test } from '@playwright/test';

// Runs in both the `mobile` and `desktop` Playwright projects (ADR 0010).
const cases = [
  { path: '/', lang: 'en', title: 'Post yourself. Get found.' },
  { path: '/ko', lang: 'ko', title: '나를 알리세요. 찾게 하세요.' },
  { path: '/ru', lang: 'ru', title: 'Расскажите о себе. Вас найдут.' },
];

for (const { path, lang, title } of cases) {
  test(`home page renders in ${lang}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });
}

test('unknown URL shows the localized not-found page', async ({ page }) => {
  const response = await page.goto('/ko/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('페이지를 찾을 수 없습니다');
});
