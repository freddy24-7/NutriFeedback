import { test, expect, type Page } from '@playwright/test';
import { mockSubscription } from './helpers';

const PRODUCT_STUB = {
  barcode: '5901234123457',
  name: 'Test Oat Bar',
  brand: 'TestBrand',
  nutritionalPer100g: {
    calories: 420,
    protein: 8,
    carbs: 60,
    fat: 12,
    fiber: 5,
    sugar: 18,
    sodium: 0.12,
  },
  servingSizeG: null,
  processingLevel: 3,
  source: 'open_food_facts',
  confidence: 0.95,
};

const ADVICE_STUB = {
  verdict: 'moderate' as const,
  headline: 'Decent snack — watch the sugar',
  body: 'This bar has a reasonable protein-to-carb ratio but contains 18g sugar per 100g.',
};

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
    localStorage.setItem('nutriapp_pwaInstallSeen', 'true');
  });
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

async function openProductCheckModal(page: Page) {
  // The "Check product" entry point is in the mobile hamburger menu.
  // On desktop it is only accessible from the mobile menu at <md breakpoint.
  // We open the menu and click the button regardless of viewport.
  await page.getByRole('button', { name: /toggle menu/i }).click();
  await page.getByRole('button', { name: /check product/i }).click();
}

test.describe('Barcode scanner — QR/barcode launch flow', () => {
  // Use a mobile viewport so the hamburger menu (and Check product button) is always visible.
  test.use({ viewport: { width: 390, height: 844 } });

  test('Check product button opens the intro modal', async ({ page }) => {
    await setupDashboard(page);
    await openProductCheckModal(page);

    await expect(page.getByRole('dialog', { name: /check product/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start scanning/i })).toBeVisible();
  });

  test('modal can be closed from the intro phase', async ({ page }) => {
    await setupDashboard(page);
    await openProductCheckModal(page);

    await page.getByRole('button', { name: /close/i }).click();

    await expect(page.getByRole('dialog', { name: /check product/i })).not.toBeVisible();
  });

  test('Start scanning launches the scanner overlay', async ({ page }) => {
    await setupDashboard(page);
    await openProductCheckModal(page);

    await page.getByRole('button', { name: /start scanning/i }).click();

    // BarcodeScanner renders a fullscreen dialog with its own aria-label
    await expect(page.getByRole('dialog', { name: /scanning/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /close scanner/i })).toBeVisible();
  });

  test('closing the scanner returns to the intro phase', async ({ page }) => {
    await setupDashboard(page);
    await openProductCheckModal(page);

    await page.getByRole('button', { name: /start scanning/i }).click();
    await expect(page.getByRole('dialog', { name: /scanning/i })).toBeVisible();

    await page.getByRole('button', { name: /close scanner/i }).click();

    // Back to intro
    await expect(page.getByRole('dialog', { name: /check product/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start scanning/i })).toBeVisible();
  });

  test('a successful scan shows product details and AI advice', async ({ page }) => {
    await page.route(`**/api/barcode/${PRODUCT_STUB.barcode}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PRODUCT_STUB),
      }),
    );
    await page.route(`**/api/barcode/${PRODUCT_STUB.barcode}/advice**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADVICE_STUB),
      }),
    );

    await setupDashboard(page);
    await openProductCheckModal(page);
    await page.getByRole('button', { name: /start scanning/i }).click();

    // Simulate a successful scan via the stub
    await page.evaluate((barcode) => {
      const trigger = (window as unknown as Record<string, unknown>)['__e2e_triggerScan'];
      if (typeof trigger === 'function') (trigger as (b: string) => void)(barcode);
    }, PRODUCT_STUB.barcode);

    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Test Oat Bar')).toBeVisible();
    await expect(page.getByText('TestBrand')).toBeVisible();
    await expect(page.getByText(ADVICE_STUB.headline)).toBeVisible();
  });

  test('product not found shows error and scan-again option', async ({ page }) => {
    await page.route('**/api/barcode/**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Product not found' }),
      }),
    );

    await setupDashboard(page);
    await openProductCheckModal(page);
    await page.getByRole('button', { name: /start scanning/i }).click();

    await page.evaluate((barcode) => {
      const trigger = (window as unknown as Record<string, unknown>)['__e2e_triggerScan'];
      if (typeof trigger === 'function') (trigger as (b: string) => void)(barcode);
    }, '0000000000000');

    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/not found/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /scan again/i })).toBeVisible();
  });

  test('scan-again resets to intro phase', async ({ page }) => {
    await page.route('**/api/barcode/**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Product not found' }),
      }),
    );

    await setupDashboard(page);
    await openProductCheckModal(page);
    await page.getByRole('button', { name: /start scanning/i }).click();

    await page.evaluate((barcode) => {
      const trigger = (window as unknown as Record<string, unknown>)['__e2e_triggerScan'];
      if (typeof trigger === 'function') (trigger as (b: string) => void)(barcode);
    }, '0000000000000');

    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /scan again/i }).click();

    await expect(page.getByRole('button', { name: /start scanning/i })).toBeVisible();
  });

  test('scan another resets to intro phase after a successful scan', async ({ page }) => {
    await page.route(`**/api/barcode/${PRODUCT_STUB.barcode}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PRODUCT_STUB),
      }),
    );
    await page.route(`**/api/barcode/${PRODUCT_STUB.barcode}/advice**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADVICE_STUB),
      }),
    );

    await setupDashboard(page);
    await openProductCheckModal(page);
    await page.getByRole('button', { name: /start scanning/i }).click();

    await page.evaluate((barcode) => {
      const trigger = (window as unknown as Record<string, unknown>)['__e2e_triggerScan'];
      if (typeof trigger === 'function') (trigger as (b: string) => void)(barcode);
    }, PRODUCT_STUB.barcode);

    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Test Oat Bar')).toBeVisible();

    await page.getByRole('button', { name: /scan another/i }).click();

    await expect(page.getByRole('button', { name: /start scanning/i })).toBeVisible();
    await expect(page.getByText('Test Oat Bar')).not.toBeVisible();
  });
});
