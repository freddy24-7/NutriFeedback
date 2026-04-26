import { test, expect, type Page } from '@playwright/test';
import { mockSession, mockSubscription } from './helpers';

const TODAY = new Date().toISOString().split('T')[0]!;

const ENTRY_STUB = {
  id: 'entry-1',
  userId: 'user_test',
  description: 'Oatmeal with banana and honey',
  mealType: 'breakfast',
  date: TODAY,
  parsedNutrients: null,
  confidence: null,
  source: 'manual',
  productId: null,
  createdAt: new Date().toISOString(),
};

async function setupDashboard(page: Page, entries: object[] = []) {
  await mockSession(page);
  await mockSubscription(page);
  await page.route('**/api/food-log**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(entries),
    }),
  );
  await page.route('**/api/ai/tips**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.addInitScript(() => {
    localStorage.setItem('nutriapp_hasCompletedOnboarding', 'true');
  });
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

test.describe('Food log — daily view', () => {
  test('empty state is shown when no entries exist for today', async ({ page }) => {
    await setupDashboard(page, []);

    await expect(page.getByText(/no entries yet today/i)).toBeVisible();
    await expect(page.getByText(/add your first meal/i)).toBeVisible();
  });

  test('adding an entry via the form makes it appear in the daily view', async ({ page }) => {
    // Use a stateful handler so the single route mock responds correctly both
    // before (empty list) and after (populated list) the POST fires.
    let entryAdded = false;

    await mockSession(page);
    await mockSubscription(page);
    await page.route('**/api/food-log**', (route) => {
      if (route.request().method() === 'POST') {
        entryAdded = true;
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(ENTRY_STUB),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(entryAdded ? [ENTRY_STUB] : []),
        });
      }
    });
    await page.route('**/api/ai/tips**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.addInitScript(() => {
      localStorage.setItem('nutriapp_hasCompletedOnboarding', 'true');
    });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open the form
    await page
      .getByRole('button', { name: /add food entry/i })
      .first()
      .click();
    await expect(page.getByLabel(/what did you eat/i)).toBeVisible();

    await page.getByLabel(/what did you eat/i).fill('Oatmeal with banana and honey');
    await page.getByRole('button', { name: /save/i }).click();

    // Wait for the POST + refetch cycle to complete
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Oatmeal with banana and honey')).toBeVisible();
  });

  test('deleting an entry removes it from the list', async ({ page }) => {
    await setupDashboard(page, [ENTRY_STUB]);

    // Entry is visible initially
    await expect(page.getByText('Oatmeal with banana and honey')).toBeVisible();

    // Mock DELETE to succeed and refetch to return empty
    await page.route('**/api/food-log**', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });

    await page.getByRole('button', { name: /delete entry/i }).click();

    await expect(page.getByText('Oatmeal with banana and honey')).not.toBeVisible();
    await expect(page.getByText(/no entries yet today/i)).toBeVisible();
  });

  test('meal-type badge is displayed with correct label', async ({ page }) => {
    await setupDashboard(page, [ENTRY_STUB]);

    // ENTRY_STUB has mealType: 'breakfast'
    await expect(page.getByText(/breakfast/i)).toBeVisible();
  });

  test('form validation prevents submission with empty description', async ({ page }) => {
    await setupDashboard(page, []);

    await page
      .getByRole('button', { name: /add food entry/i })
      .first()
      .click();
    await expect(page.getByLabel(/what did you eat/i)).toBeVisible();

    // Submit without filling in the description
    await page.getByRole('button', { name: /save/i }).click();

    // Validation error should appear
    await expect(page.getByRole('alert')).toBeVisible();
    // Form should still be open (no navigation or dismissal)
    await expect(page.getByLabel(/what did you eat/i)).toBeVisible();
  });
});
