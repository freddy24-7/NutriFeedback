import type { Page } from '@playwright/test';

// Auth state is provided by the e2e Clerk mock (src/lib/auth/e2e-clerk-mock.tsx),
// active when the dev server runs with VITE_E2E_TEST_MODE=true (set in playwright.config.ts).
// Tests that need unauthenticated or sign-in-error states write to window.__e2e_*
// via page.addInitScript() before navigating.

export async function mockSubscription(
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

// Navigate to /pricing and wait for the subscription fetch to settle.
export async function gotoAuthenticatedPage(page: Page) {
  await mockSubscription(page);
  await page.goto('/pricing');
  await page.waitForLoadState('networkidle');
}
