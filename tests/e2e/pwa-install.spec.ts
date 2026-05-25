import { test, expect, type Page } from '@playwright/test';
import { mockSubscription } from './helpers';

async function setupDashboard(page: Page) {
  await mockSubscription(page);
  await page.route('**/api/food-log**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/ai/tips**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.addInitScript(() => {
    localStorage.setItem('nutriapp_hasCompletedOnboarding', 'true');
    // Deliberately NOT setting nutriapp_pwaInstallSeen so the nudge fires
  });
  await page.goto('/dashboard');
}

test.describe('Desktop PWA install banner — QR code prompt', () => {
  // isMobileDevice() checks pointer: coarse, not viewport width.
  // Mobile Safari always reports a coarse pointer so it shows MobileInstallModal
  // instead of DesktopInstallBanner. These tests only apply to desktop projects.
  test.skip(({ browserName }) => browserName !== 'chromium', 'desktop-only banner');
  test.use({ viewport: { width: 1280, height: 800 } });

  test('QR code banner appears for a new desktop user', async ({ page }) => {
    await setupDashboard(page);

    const banner = page.getByRole('region', { name: /scan barcodes on your phone/i });
    await expect(banner).toBeVisible({ timeout: 3000 });
    // QR code SVG is rendered inside the banner
    await expect(banner.locator('svg').first()).toBeVisible();
    await expect(banner.getByText(/scan this qr code with your phone/i)).toBeVisible();
  });

  test('banner is not shown when pwa nudge has already been seen', async ({ page }) => {
    await mockSubscription(page);
    await page.route('**/api/food-log**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.route('**/api/ai/tips**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.addInitScript(() => {
      localStorage.setItem('nutriapp_hasCompletedOnboarding', 'true');
      localStorage.setItem('nutriapp_pwaInstallSeen', 'true');
    });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('region', { name: /scan barcodes on your phone/i }),
    ).not.toBeVisible();
  });

  test('dismissing the banner hides it', async ({ page }) => {
    await setupDashboard(page);

    const banner = page.getByRole('region', { name: /scan barcodes on your phone/i });
    await expect(banner).toBeVisible({ timeout: 3000 });

    await banner.getByRole('button', { name: /dismiss/i }).click();

    await expect(banner).not.toBeVisible();
  });

  test('dismissing sets the seen flag so banner does not reappear on reload', async ({ page }) => {
    await setupDashboard(page);

    const banner = page.getByRole('region', { name: /scan barcodes on your phone/i });
    await expect(banner).toBeVisible({ timeout: 3000 });

    await banner.getByRole('button', { name: /dismiss/i }).click();

    // Reload — the flag should be persisted in localStorage
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('region', { name: /scan barcodes on your phone/i }),
    ).not.toBeVisible();
  });
});
