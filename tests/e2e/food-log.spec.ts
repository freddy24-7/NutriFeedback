import { test } from '@playwright/test';

test.describe('Food log — daily view', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: inject auth session via storageState before these tests run
    await page.goto('/dashboard');
  });

  test.todo('empty state is shown when no entries exist for today');

  test.todo('adding an entry via the form makes it appear in the daily view');

  test.todo('deleting an entry removes it from the list');

  test.todo('meal-type badge is displayed with correct label');

  test.todo('form validation prevents submission with empty description');
});
