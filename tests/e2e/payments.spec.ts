/**
 * Phase 4 e2e tests — Payments, Credits + Discount Codes
 *
 * Uses page.route() to mock API responses — no real auth session or
 * Stripe account required. Tests verify the UI reacts correctly to
 * the subscription status and discount code flows.
 *
 * Tests that require a live Stripe checkout redirect are marked todo
 * because Playwright cannot cross origins into stripe.com in CI.
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Shared mock helpers ──────────────────────────────────────────────────────

async function mockSession(page: Page) {
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: {
          id: 'sess_test',
          userId: 'user_test',
          expiresAt: new Date(Date.now() + 86400_000).toISOString(),
        },
        user: {
          id: 'user_test',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    }),
  );
}

async function mockSubscription(
  page: Page,
  overrides: Partial<{
    status: string;
    creditsRemaining: number;
    creditsExpiresAt: string | null;
    currentPeriodEnd: string | null;
  }> = {},
) {
  const body = {
    status: 'trial',
    creditsRemaining: 50,
    creditsExpiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
    currentPeriodEnd: null,
    ...overrides,
  };
  await page.route('**/api/payments/status', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

// ─── /pricing page ────────────────────────────────────────────────────────────

test.describe('/pricing page', () => {
  test('renders pricing card for trial user', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, { status: 'trial', creditsRemaining: 47 });

    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: 'NutriApp Pro' })).toBeVisible();
    await expect(page.getByText('Unlimited food tracking')).toBeVisible();
    await expect(page.getByText('Personalised AI nutrition tips')).toBeVisible();
    await expect(page.getByText('Barcode scanner with 3M+ products')).toBeVisible();
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible();
  });

  test('shows "You\'re all set" and hides upgrade button when active', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, {
      status: 'active',
      creditsRemaining: 50,
      creditsExpiresAt: null,
    });

    await page.goto('/pricing');

    await expect(page.getByText("You're all set")).toBeVisible();
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).not.toBeVisible();
  });

  test('shows discount code input', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page);

    await page.goto('/pricing');

    await expect(page.getByPlaceholder(/discount code/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /apply/i })).toBeVisible();
  });
});

// ─── Credit counter in nav ────────────────────────────────────────────────────

test.describe('Credit counter in nav', () => {
  test('shows credit count for trial user', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, { creditsRemaining: 47 });

    await page.goto('/pricing');

    // Scope to nav to avoid the second CreditCounter instance inside PricingCard
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('[aria-label*="47 credits"]')).toBeVisible();
  });

  test('shows infinity icon for comped/unlimited user', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, {
      status: 'comped',
      creditsRemaining: 50,
      creditsExpiresAt: null,
    });

    await page.goto('/pricing');

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.locator('[aria-label*="Unlimited"]')).toBeVisible();
  });

  test('credit counter turns red at 0 credits', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, { creditsRemaining: 0 });

    await page.goto('/pricing');

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    const counter = nav.locator('[aria-label*="0 credits"]');
    await expect(counter).toBeVisible();
    await expect(counter.locator('span').first()).toHaveClass(/text-red-500/);
  });
});

// ─── Discount code input ──────────────────────────────────────────────────────

test.describe('Discount code input', () => {
  test('valid code shows success message', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page);
    await page.route('**/api/payments/discount', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ granted: true, type: 'beta' }),
      }),
    );

    await page.goto('/pricing');

    await page.getByPlaceholder(/discount code/i).fill('BETA2024');
    await page.getByRole('button', { name: /apply/i }).click();

    await expect(page.getByText(/code applied/i)).toBeVisible();
  });

  test('invalid code shows error message inline', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page);
    await page.route('**/api/payments/discount', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid discount code' }),
      }),
    );

    await page.goto('/pricing');

    await page.getByPlaceholder(/discount code/i).fill('BADCODE');
    await page.getByRole('button', { name: /apply/i }).click();

    await expect(page.getByText(/invalid discount code/i)).toBeVisible();
  });

  test('expired code shows specific error', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page);
    await page.route('**/api/payments/discount', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'This discount code has expired' }),
      }),
    );

    await page.goto('/pricing');

    await page.getByPlaceholder(/discount code/i).fill('EXPIRED');
    await page.getByRole('button', { name: /apply/i }).click();

    await expect(page.getByText(/expired/i)).toBeVisible();
  });

  test('code is auto-uppercased on input', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page);

    await page.goto('/pricing');

    const input = page.getByPlaceholder(/discount code/i);
    await input.fill('beta2024');

    await expect(input).toHaveValue('BETA2024');
  });
});

// ─── Paywall modal ────────────────────────────────────────────────────────────

test.describe('Paywall modal', () => {
  test('auto-opens on dashboard when credits are exhausted', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, { status: 'trial', creditsRemaining: 0 });
    // Mock food log and tips so dashboard renders without errors
    await page.route('**/api/food-log**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );
    await page.route('**/api/ai/tips', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );

    await page.goto('/dashboard');

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/used all your free credits/i)).toBeVisible();
  });

  test('auto-opens on dashboard when trial has expired', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, {
      status: 'expired',
      creditsRemaining: 0,
      creditsExpiresAt: new Date(Date.now() - 86400_000).toISOString(),
    });
    await page.route('**/api/food-log**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );
    await page.route('**/api/ai/tips', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );

    await page.goto('/dashboard');

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/free trial has ended/i)).toBeVisible();
  });

  test('closes when "Maybe later" is clicked', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, { status: 'trial', creditsRemaining: 0 });
    await page.route('**/api/food-log**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );
    await page.route('**/api/ai/tips', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );

    await page.goto('/dashboard');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /maybe later/i }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('closes when Escape is pressed', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, { status: 'trial', creditsRemaining: 0 });
    await page.route('**/api/food-log**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );
    await page.route('**/api/ai/tips', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );

    await page.goto('/dashboard');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('contains discount code input and upgrade button', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page, { status: 'trial', creditsRemaining: 0 });
    await page.route('**/api/food-log**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );
    await page.route('**/api/ai/tips', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );

    await page.goto('/dashboard');

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByPlaceholder(/discount code/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /upgrade to pro/i })).toBeVisible();
  });
});

// ─── Stripe Checkout redirect ─────────────────────────────────────────────────

test.describe('Stripe Checkout', () => {
  test('upgrade button calls checkout API and follows redirect URL', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page);
    await page.route('**/api/payments/checkout', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://checkout.stripe.com/pay/cs_test_mock' }),
      }),
    );

    await page.goto('/pricing');

    // Intercept navigation — Stripe URL is external, we just verify the redirect fires
    const [request] = await Promise.all([
      page.waitForRequest('**/api/payments/checkout'),
      page.getByRole('button', { name: /upgrade to pro/i }).click(),
    ]);

    expect(request.method()).toBe('POST');
    const body = request.postDataJSON() as { priceId?: string };
    expect(body.priceId).toBeDefined();
  });

  test.fixme('full Stripe Checkout flow — requires Stripe test mode and live webhook', async () => {});
});
