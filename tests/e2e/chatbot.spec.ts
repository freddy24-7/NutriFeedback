/**
 * Phase 5 e2e tests — Chatbot drawer + How to Use modal
 *
 * Uses page.route() to mock API responses — no real auth session or AI call required.
 * The chat button and HowToUse link only render for authenticated users, so every
 * test navigates to /pricing with a mocked session.
 */

import { test, expect, type Page } from '@playwright/test';
import { gotoAuthenticatedPage } from './helpers';

// ─── Chat API mock helpers ────────────────────────────────────────────────────

async function mockChatFaq(page: Page) {
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        answer: 'NutriApp is a flexible nutrition tracker.',
        source: 'faq',
        faqId: 'what-is-app',
      }),
    }),
  );
}

async function mockChatAi(page: Page) {
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        answer: 'This is an AI-generated response.',
        source: 'ai',
      }),
    }),
  );
}

async function mockChatRateLimited(page: Page) {
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Rate limit exceeded — try again tomorrow' }),
    }),
  );
}

// ─── Chatbot drawer ───────────────────────────────────────────────────────────

test.describe('Chatbot drawer', () => {
  test('chat button is visible for authenticated users', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await expect(page.getByRole('button', { name: /open chat/i })).toBeVisible();
  });

  test('opens drawer when chat button is clicked', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('shows greeting message on open', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();
    await expect(page.getByText(/here to help with questions about NutriApp/i)).toBeVisible();
  });

  test('shows FAQ suggestion chips on open', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();
    await expect(page.getByRole('button', { name: 'What is NutriApp?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Is it free?' })).toBeVisible();
  });

  test('sends message via input and shows bot response', async ({ page }) => {
    await mockChatFaq(page);
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('What is NutriApp?');
    await dialog.getByRole('button', { name: /^send$/i }).click();

    await expect(page.getByText('NutriApp is a flexible nutrition tracker.')).toBeVisible();
  });

  test('clicking a FAQ chip sends message and shows response', async ({ page }) => {
    await mockChatFaq(page);
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();

    await page.getByRole('button', { name: 'What is NutriApp?' }).click();

    await expect(page.getByText('NutriApp is a flexible nutrition tracker.')).toBeVisible();
  });

  test('shows AI source label for AI responses', async ({ page }) => {
    await mockChatAi(page);
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('What is the weather today?');
    await dialog.getByRole('button', { name: /^send$/i }).click();

    await expect(page.getByText('This is an AI-generated response.')).toBeVisible();
    await expect(page.getByText(/AI response/i)).toBeVisible();
  });

  test('shows rate limit message and disables input on 429', async ({ page }) => {
    await mockChatRateLimited(page);
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('hello');
    await dialog.getByRole('button', { name: /^send$/i }).click();

    await expect(page.getByText(/daily message limit/i)).toBeVisible();
    await expect(dialog.getByRole('textbox')).toBeDisabled();
  });

  test('closes on close button click', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /close chat/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('closes on Escape key', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /open chat/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

// ─── How to Use modal ─────────────────────────────────────────────────────────

test.describe('How to Use modal', () => {
  test('"How to use" button is visible in footer for authenticated users', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await expect(page.getByRole('button', { name: /how to use/i })).toBeVisible();
  });

  test('opens modal when button is clicked', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /how to use/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('How to use NutriApp')).toBeVisible();
  });

  test('shows all 4 steps', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /how to use/i }).click();

    await expect(page.getByText('Log your meals')).toBeVisible();
    await expect(page.getByText('Scan barcodes')).toBeVisible();
    await expect(page.getByText('Get AI tips')).toBeVisible();
    await expect(page.getByText('Track over time')).toBeVisible();
  });

  test('closes on close button click', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /how to use/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('closes on Escape key', async ({ page }) => {
    await gotoAuthenticatedPage(page);
    await page.getByRole('button', { name: /how to use/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
