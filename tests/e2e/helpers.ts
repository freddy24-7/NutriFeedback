import type { Page } from '@playwright/test';

export async function mockSession(page: Page) {
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

// Navigate to /pricing and wait for both session + subscription fetches to settle.
// useSubscription is gated on session, so two async hops must complete before
// the page is fully rendered — waitForLoadState('networkidle') ensures both resolve.
export async function gotoAuthenticatedPage(page: Page) {
  await mockSession(page);
  await mockSubscription(page);
  await page.goto('/pricing');
  await page.waitForLoadState('networkidle');
}
