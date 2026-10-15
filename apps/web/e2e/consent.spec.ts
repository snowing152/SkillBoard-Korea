import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { outdateConsent } from './db';

// Spec: docs/specs/legal.md, criteria 1, 4, 5 and 7. Runs in both viewports (ADR 0010).
// Each test registers its own user through the API: both viewport projects run against one database,
// so a shared seeded user would already have accepted by the time the second project signs in.
// Sign-up now records TERMS and PRIVACY (accounts spec), so the user's PRIVACY row is aged to a version
// that is no longer current: the same "one document pending" state a new LEGAL_VERSIONS value causes.
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';
const PASSWORD = 'Password123!';

test.describe('legal pages', () => {
  for (const [path, title] of [
    ['/legal/privacy', 'Privacy policy'],
    ['/legal/terms', 'Terms of use'],
    ['/legal/visa', 'Visa disclaimer'],
  ] as const) {
    test(`${path} renders for visitors with footer links`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
      const footer = page.getByRole('navigation', { name: 'Legal' });
      await expect(footer.getByRole('link')).toHaveCount(3);
    });
  }

  test('footer links keep the locale', async ({ page }) => {
    await page.goto('/ko/legal/privacy');
    await expect(page.getByRole('heading', { level: 1, name: '개인정보 처리방침' })).toBeVisible();
    await expect(page.getByRole('link', { name: '이용약관' })).toHaveAttribute(
      'href',
      '/ko/legal/terms',
    );
  });
});

test('a user with a pending document must accept it before using /me', async ({
  page,
  request,
}) => {
  const email = `e2e-consent-${randomUUID().slice(0, 8)}@skillboard.local`;
  const res = await request.post(`${API_URL}/v1/auth/register`, {
    data: {
      email,
      password: PASSWORD,
      displayName: 'E2E Consent',
      role: 'CLIENT',
      locale: 'en',
      acceptTerms: true,
    },
  });
  expect(res.status()).toBe(201);
  await outdateConsent(email, 'PRIVACY');

  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/consent\?next=/);
  // Only the pending document is listed; the terms are accepted.
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expect(page.getByText(/accept the Privacy policy/)).toBeVisible();

  // Opening another /me page directly is redirected back with the page to return to.
  await page.goto('/me/account');
  await expect(page).toHaveURL(/\/consent\?next=%2Fme%2Faccount/);

  const submit = page.getByRole('button', { name: 'Accept and continue' });
  await expect(submit).toBeDisabled();
  await page.getByRole('checkbox').check();
  await submit.click();

  await expect(page).toHaveURL(/\/me\/account$/);
  await expect(page.getByRole('heading', { level: 1, name: 'My account' })).toBeVisible();
  // The history keeps the outdated row and adds one at the current version (legal spec, criterion 5).
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: 'Privacy policy' })
      .filter({ hasText: '2026-10-14 · Language: en' }),
  ).toHaveCount(1);
});

// Criterion 9: the visa sentence and its link are on the public profile, and nothing scrolls sideways
// (the mobile project is a 390 px phone). `anna-petrova` is seeded, published, with a visa type.
for (const [prefix, link] of [
  ['', 'Read the visa disclaimer'],
  ['/ko', '비자 관련 안내 보기'],
  ['/ru', 'Прочитать визовую оговорку'],
] as const) {
  test(`public profile shows the visa disclaimer without horizontal scroll (${prefix || '/en'})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/t/anna-petrova`);
    await expect(page.getByRole('link', { name: link })).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
}

test('legal pages do not scroll sideways', async ({ page }) => {
  for (const path of ['/legal/privacy', '/ru/legal/privacy', '/sign-in']) {
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows, path).toBe(false);
  }
});
