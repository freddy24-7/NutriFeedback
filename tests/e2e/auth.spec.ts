import { test, expect, type Page } from '@playwright/test';
import { mockSubscription } from './helpers';

// Auth flows use the e2e Clerk mock module (src/lib/auth/e2e-clerk-mock.tsx).
// The mock's signIn.create() / signUp.create() return predictable results so
// tests verify UI state transitions without any real Clerk API calls.

async function mockDashboardApis(page: Page) {
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
    // signUp.create() returns status:'missing_requirements' → triggers OTP screen
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

    await page.getByLabel(/email/i).fill('new@example.com');
    await page.getByLabel(/^password$/i).fill('SecurePass123!');
    await page.getByLabel(/confirm password/i).fill('SecurePass123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
  });

  test('successful sign-up shows email confirmation with submitted address', async ({ page }) => {
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
    // signIn.create() returns status:'complete' → navigate('/dashboard')
    await mockDashboardApis(page);
    await page.addInitScript(() => {
      localStorage.setItem('nutriapp_hasCompletedOnboarding', 'true');
    });

    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('correctpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/dashboard**', { timeout: 8000 });
    await expect(page.getByRole('heading', { name: /today's food log/i })).toBeVisible();
  });

  test('sign-in with wrong password shows error message', async ({ page }) => {
    // window.__e2e_signin_error causes signIn.create() to throw → error alert shown
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__e2e_signin_error = true;
    });

    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/signin/);
  });

  test('forgot password form submits and shows confirmation', async ({ page }) => {
    // signIn.create({ strategy:'reset_password_email_code' }) succeeds → step:'reset' renders
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByRole('heading', { name: /reset link sent/i })).toBeVisible();
  });

  test('protected route /dashboard redirects unauthenticated user to /signin', async ({ page }) => {
    // window.__e2e_signed_out makes useAuth() return isSignedIn:false
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__e2e_signed_out = true;
    });

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
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Preference survives a page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
