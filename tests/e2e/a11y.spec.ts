import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSession, mockSubscription, gotoAuthenticatedPage } from './helpers';

test.describe('accessibility — public pages', () => {
  test('home page has no critical a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });

  test('contact page has no critical a11y violations', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });

  test('pricing page has no critical a11y violations', async ({ page }) => {
    await mockSession(page);
    await mockSubscription(page);
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });

  test('sign-in page has no critical a11y violations', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });

  test('sign-up page has no critical a11y violations', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });

  test('404 page has no critical a11y violations', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('accessibility — interactive states', () => {
  test('contact form validation errors are accessible', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for validation errors to appear
    await page.waitForSelector('[role="alert"]');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations).toEqual([]);
  });

  test('chatbot drawer is accessible when open', async ({ page }) => {
    await gotoAuthenticatedPage(page);

    await page.getByRole('button', { name: /open chat/i }).click();
    await page.waitForSelector('[role="dialog"]');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('[role="dialog"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('how-to-use modal is accessible when open', async ({ page }) => {
    await gotoAuthenticatedPage(page);

    await page.getByRole('button', { name: /how to use/i }).click();
    await page.waitForSelector('[role="dialog"]');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('[role="dialog"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
