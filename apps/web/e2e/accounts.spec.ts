import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

// Spec: docs/specs/accounts.md, criteria 1, 2, 4, 10, 11 and 13. Runs in both viewports (ADR 0010).
// Sign-up is the flow under test here, so it goes through the UI. The Google redirect dance and the
// email links cannot run without Google and a mail provider: they are covered by API unit tests and
// the API e2e test, which reads the outgoing mail.
const PASSWORD = 'Password123!';
const SESSION_COOKIE = 'skillboard_session';
const REFRESH_COOKIE = 'skillboard_refresh';

const newEmail = () => `e2e-accounts-${randomUUID().slice(0, 8)}@skillboard.local`;

test.describe('sign-up', () => {
  test('needs the consent box, then lands on the "check your inbox" page', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByLabel('Your name').fill('E2E Newcomer');
    await page.getByLabel('Email').fill(newEmail());
    await page.getByLabel('Password').fill(PASSWORD);

    // Criterion 1: unticked box → field error, still on the form.
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Please accept the terms to continue.')).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);

    await page.getByRole('checkbox', { name: /Terms of use/ }).click();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/verify-email\/sent$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Check your inbox' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send the email again' })).toBeEnabled();
  });

  test('an unverified user reaches the profile page with the verify banner', async ({ page }) => {
    const email = newEmail();
    await page.goto('/sign-up');
    await page.getByLabel('Your name').fill('E2E Unverified');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('checkbox', { name: /Terms of use/ }).click();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/verify-email\/sent$/);

    await page.goto('/me/talent-profile');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You have no profile yet');
    await expect(page.getByText(/Verify your email to contact talents/)).toBeVisible();
  });

  test('a taken email shows the sign-in hint', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByLabel('Your name').fill('E2E Duplicate');
    await page.getByLabel('Email').fill('talent01@skillboard.local');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('checkbox', { name: /Terms of use/ }).click();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/already exists/)).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);
  });
});

test.describe('sign-in', () => {
  test('a talent lands on the profile page and a client on the talent list', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill('talent01@skillboard.local');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/me\/talent-profile$/);

    await page.context().clearCookies();
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill('client@skillboard.local');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/talents$/);
  });

  test('honours a safe ?next= and ignores an external one (criterion 10)', async ({ page }) => {
    await page.goto('/sign-in?next=%2Fme%2Faccount');
    await page.getByLabel('Email').fill('client@skillboard.local');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/me\/account$/);

    await page.context().clearCookies();
    await page.goto('/sign-in?next=%2F%2Fevil.example');
    await page.getByLabel('Email').fill('client@skillboard.local');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/talents$/);
  });

  test('an unknown ?error= code shows the generic Google failure text', async ({ page }) => {
    await page.goto('/sign-in?error=%3Cscript%3E');
    await expect(page.getByText('Google sign-in did not complete')).toBeVisible();
  });
});

test.describe('session', () => {
  test('is renewed from the refresh cookie when the access cookie is gone (criterion 4)', async ({
    page,
    context,
  }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill('talent01@skillboard.local');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/me\/talent-profile$/);

    // The access token lives 15 minutes; deleting its cookie is the same situation, instantly.
    await context.clearCookies({ name: SESSION_COOKIE });
    expect((await context.cookies()).some((c) => c.name === SESSION_COOKIE)).toBe(false);

    await page.reload();
    await expect(page).toHaveURL(/\/me\/talent-profile$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const names = (await context.cookies()).map((c) => c.name);
    expect(names).toContain(SESSION_COOKIE);
    expect(names).toContain(REFRESH_COOKIE);
  });

  test('signing out clears both cookies and the profile page asks to sign in again', async ({
    page,
    context,
  }) => {
    // A fresh account: seeded users keep their own stored language, which would change the UI text.
    await page.goto('/sign-up');
    await page.getByLabel('Your name').fill('E2E Leaver');
    await page.getByLabel('Email').fill(newEmail());
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('checkbox', { name: /Terms of use/ }).click();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/verify-email\/sent$/);
    await page.goto('/me/talent-profile');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/$/);
    const names = (await context.cookies()).map((c) => c.name);
    expect(names).not.toContain(SESSION_COOKIE);
    expect(names).not.toContain(REFRESH_COOKIE);

    await page.goto('/me/talent-profile');
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('changing the language in settings reopens the page under that locale (criterion 11)', async ({
    page,
  }) => {
    // A fresh account, so the stored language of a shared seed user is never changed.
    const email = newEmail();
    await page.goto('/sign-up');
    await page.getByLabel('Your name').fill('E2E Polyglot');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('checkbox', { name: /Terms of use/ }).click();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/verify-email\/sent$/);

    await page.goto('/me/account');
    await expect(page.getByRole('heading', { level: 1, name: 'My account' })).toBeVisible();
    await page.getByLabel('Language', { exact: true }).selectOption('ko');
    await page.getByRole('button', { name: 'Save' }).click();
    // The first request to /ko compiles the route in `next dev`; allow for it.
    await expect(page).toHaveURL(/\/ko\/me\/account$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 1, name: '내 계정' })).toBeVisible();
  });
});

test.describe('google role step', () => {
  test('without the callback cookie there is nothing to finish: back to sign-up', async ({
    page,
  }) => {
    await page.goto('/sign-up/google');
    await expect(page).toHaveURL(/\/sign-up$/);
  });
});

test.describe('google callback binding (login CSRF)', () => {
  const FAILED = 'Google sign-in did not complete';

  test('a callback link from another browser is refused: no cookie', async ({ page }) => {
    for (const query of ['code=forged-code-from-attacker&n=abc', 'signup=forged&n=abc']) {
      await page.goto(`/auth/callback?${query}`);
      await expect(page).toHaveURL(/\/sign-in\?error=OAUTH_FAILED$/);
      await expect(page.getByText(FAILED)).toBeVisible();
      const names = (await page.context().cookies()).map((c) => c.name);
      expect(names).not.toContain(SESSION_COOKIE);
      expect(names).not.toContain('skillboard_google_signup');
    }
  });

  test('a callback link whose nonce differs from this browser’s cookie is refused', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'skillboard_google_nonce',
        value: 'cookie-nonce-of-this-browser',
        url: 'http://localhost:3000',
      },
    ]);
    await page.goto('/auth/callback?code=forged-code-from-attacker&n=attacker-nonce');
    await expect(page).toHaveURL(/\/sign-in\?error=OAUTH_FAILED$/);
    expect((await context.cookies()).map((c) => c.name)).not.toContain(SESSION_COOKIE);
  });

  test('the start route does nothing while Google is switched off', async ({ page }) => {
    await page.goto('/auth/google?role=CLIENT&acceptTerms=true');
    await expect(page).toHaveURL(/\/sign-in\?error=OAUTH_FAILED$/);
  });
});

test.describe('password change', () => {
  test('keeps this device signed in', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByLabel('Your name').fill('E2E Changer');
    await page.getByLabel('Email').fill(newEmail());
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('checkbox', { name: /Terms of use/ }).click();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/verify-email\/sent$/);

    await page.goto('/me/account');
    await page.getByLabel('Current password').fill(PASSWORD);
    await page.getByLabel('New password').fill('Another-pass-456!');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Password changed.')).toBeVisible();

    // The refresh token of this device survived: dropping the access cookie still renews the session.
    await page.context().clearCookies({ name: SESSION_COOKIE });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'My account' })).toBeVisible();
  });
});

test.describe('password reset', () => {
  test('always answers with the same text, for any address', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('nobody-here@skillboard.local');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/If an account exists for this address/)).toBeVisible();
  });

  test('a reset link without a token says it is expired', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText('This link has expired or was already used.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
  });
});

// Criterion 13: every new page renders in the three languages and nothing scrolls sideways at phone
// width (the mobile project is a 390 px phone).
for (const prefix of ['', '/ko', '/ru']) {
  test(`new pages do not scroll sideways (${prefix || '/en'})`, async ({ page }) => {
    for (const path of [
      '/sign-up',
      '/sign-in',
      '/forgot-password',
      '/reset-password?token=abc',
      '/verify-email/sent',
      '/verify-email',
    ]) {
      await page.goto(`${prefix}${path}`);
      await expect(page.getByRole('main')).toBeVisible();
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows, `${prefix}${path}`).toBe(false);
    }
  });
}
