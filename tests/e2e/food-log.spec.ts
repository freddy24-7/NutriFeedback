import { test } from '@playwright/test';

test.describe('Food log — daily view', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: inject auth session via storageState before these tests run
    await page.goto('/dashboard');
  });

  test.fixme('empty state is shown when no entries exist for today', async () => {});

  test.fixme('adding an entry via the form makes it appear in the daily view', async () => {});

  test.fixme('deleting an entry removes it from the list', async () => {});

  test.fixme('meal-type badge is displayed with correct label', async () => {});

  test.fixme('form validation prevents submission with empty description', async () => {});
});
