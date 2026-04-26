import { test, expect, type Page } from '@playwright/test';
import { mockSession, mockSubscription } from './helpers';

// Better Auth endpoint patterns (mounted at /api/auth by Hono)
const SIGN_IN_ENDPOINT = '**/api/auth/sign-in/email';
const SIGN_UP_ENDPOINT = '**/api/auth/sign-up/email';
const FORGOT_PASSWORD_ENDPOINT = '**/api/auth/request-password-reset';

// Mock all APIs needed for the dashboard to render after a redirect
async function mockDashboardApis(page: Page) {
  await mockSession(page);
  await mockSubscription(page);
  await page.route('**/api/food-log**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/ai/tips**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test.describe('Auth flows', () => {
  test('sign-up page renders and submits form', async ({ page }) => {
    await page.route(SIGN_UP_ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user_test', email: 'new@example.com' } }),
      }),
    );

    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

    await page.getByLabel(/email/i).fill('new@example.com');
    await page.getByLabel(/^password$/i).fill('SecurePass123!');
    await page.getByLabel(/confirm password/i).fill('SecurePass123!');
    await page.getByRole('button', { name: /create account/i }).click();

    // Successful submission shows email confirmation screen, not form errors
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
  });

  test('successful sign-up shows email confirmation', async ({ page }) => {
    await page.route(SIGN_UP_ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user_test', email: 'confirmed@example.com' } }),
      }),
    );

    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('confirmed@example.com');
    await page.getByLabel(/^password$/i).fill('SecurePass123!');
    await page.getByLabel(/confirm password/i).fill('SecurePass123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
    await expect(page.getByText(/confirmed@example\.com/)).toBeVisible();
  });

  test('sign-in with valid credentials reaches dashboard', async ({ page }) => {
    await page.route(SIGN_IN_ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user_test', email: 'test@example.com' },
          redirect: false,
        }),
      }),
    );
    await mockDashboardApis(page);

    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('correctpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/dashboard**', { timeout: 8000 });
    await expect(page.getByRole('heading', { name: /today's food log/i })).toBeVisible();
  });

  test('sign-in with wrong password shows error message', async ({ page }) => {
    await page.route(SIGN_IN_ENDPOINT, (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      }),
    );

    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    // Should stay on the sign-in page
    await expect(page).toHaveURL(/signin/);
  });

  test('forgot password form submits and shows confirmation', async ({ page }) => {
    await page.route(FORGOT_PASSWORD_ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: true }),
      }),
    );

    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByRole('heading', { name: /reset link sent/i })).toBeVisible();
  });

  test('protected route /dashboard redirects unauthenticated user to /signin', async ({ page }) => {
    // Return null session so ProtectedRoute's Navigate fires
    await page.route('**/api/auth/get-session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'null',
      }),
    );

    await page.goto('/dashboard');
    await page.waitForURL('**/signin**', { timeout: 8000 });
    await expect(page).toHaveURL(/signin/);
  });
});

test.describe('Theme + language toggles', () => {
  test('language toggle switches from EN to NL and persists after reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // EN is active by default — click the NL button (aria-pressed=false)
    await page.getByRole('button', { name: 'NL' }).click();

    // The hero title appears in Dutch on the home page
    await expect(page.getByText(/voedingstracking/i)).toBeVisible();

    // Preference survives a page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/voedingstracking/i)).toBeVisible();
  });

  test('theme toggle switches to dark and persists after reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    // The html element receives the .dark class
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Preference survives a page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
