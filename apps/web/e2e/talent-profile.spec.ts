import { randomUUID } from 'node:crypto';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { SEED_PASSWORD } from '../test/fixtures/credentials';
import { markEmailVerified } from './db';

// Spec: docs/specs/talent-profiles.md, criteria 2, 4, 5 and 6. Runs in both viewports (ADR 0010).
// Needs the API on E2E_API_URL (playwright.config.ts starts it) with the seed applied.
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';
const PASSWORD = SEED_PASSWORD;
const HEADLINE = 'E2E tutor for children in Seoul';

/**
 * Account creation is a prerequisite, not the flow under test, so it goes through the API.
 * The suffix is random only to keep repeated runs independent; nothing asserts on it.
 */
async function registerTalent(request: APIRequestContext): Promise<string> {
  const email = `e2e-web-${randomUUID().slice(0, 8)}@skillboard.local`;
  const res = await request.post(`${API_URL}/v1/auth/register`, {
    data: {
      email,
      password: PASSWORD,
      displayName: 'E2E Web Talent',
      role: 'TALENT',
      locale: 'en',
      acceptTerms: true,
    },
  });
  expect(res.status()).toBe(201);
  // A published profile is public only once the owner's email is verified (accounts spec); the link
  // flow has its own tests, so this prerequisite is set directly.
  await markEmailVerified(email);
  return email;
}

test('talent signs in, creates a draft, publishes it and gets a public page', async ({
  page,
  request,
}) => {
  const email = await registerTalent(request);

  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/me\/talent-profile$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('You have no profile yet');

  await page.getByRole('link', { name: 'Create profile' }).click();
  await expect(page).toHaveURL(/\/me\/talent-profile\/edit$/);
  await page.getByLabel('Headline').fill(HEADLINE);
  await page
    .getByLabel('About you')
    .fill('Patient tutor with five years of experience teaching children online and at home.');
  await page.getByRole('checkbox', { name: 'Russian tutor' }).click();

  // Visa disclaimer: required on create, so submitting without it shows the field error (criterion 2).
  await page.getByRole('button', { name: 'Create profile' }).click();
  await expect(page).toHaveURL(/\/me\/talent-profile\/edit$/);
  await expect(
    page.getByRole('alert').filter({ hasText: /expected true|required|invalid/i }),
  ).toBeVisible();
  await page
    .getByRole('checkbox', {
      name: 'I understand that I am responsible for working within my visa rules.',
    })
    .click();
  await page.getByRole('button', { name: 'Create profile' }).click();

  await expect(page).toHaveURL(/\/me\/talent-profile$/);
  await expect(page.getByText('Draft: only you can see this profile.')).toBeVisible();
  const publicUrl = /\/t\/[a-z0-9-]+/.exec(
    (await page.getByText('Public address:').textContent()) ?? '',
  )?.[0];
  expect(publicUrl).toBeDefined();

  // A draft is 404 for the public.
  const draftResponse = await page.goto(publicUrl ?? '/t/missing');
  expect(draftResponse?.status()).toBe(404);

  await page.goto('/me/talent-profile');
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Published: anyone can open your public page.')).toBeVisible();

  await page.getByRole('link', { name: 'View public page' }).click();
  await expect(page).toHaveURL(new RegExp(`${publicUrl ?? ''}$`));
  // M4 layout: the name is the page heading, the headline sits under it.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Web Talent');
  await expect(page.getByText(HEADLINE, { exact: true })).toBeVisible();
  await expect(page.getByText(email)).toHaveCount(0); // contact methods never render publicly
});
