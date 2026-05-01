// @vitest-environment node
/**
 * Integration tests for POST /api/contact
 *
 * Resend is mocked — no real emails are sent.
 * The contact route is public (no auth required).
 * Run with: DATABASE_URL=$DATABASE_URL_DEV npm run test:integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { contactRoutes } from '@/api/routes/contact';
import { type AuthVariables } from '@/api/middleware/auth';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/redis/client', async () => {
  const { mockRedisModule } = await import('../helpers/mockRateLimiter');
  return mockRedisModule();
});

const mockEmailSend = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockEmailSend },
  })),
}));

// ─── Test app ─────────────────────────────────────────────────────────────────

function createContactApp() {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');
  app.route('/contact', contactRoutes);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/contact', () => {
  beforeEach(() => {
    process.env['RESEND_API_KEY'] = 'test-key';
    process.env['RESEND_FROM_EMAIL'] = 'hello@nutriapp.test';
    mockEmailSend.mockResolvedValue({ error: null });
    vi.clearAllMocks();
    mockEmailSend.mockResolvedValue({ error: null });
  });

  it('sends an email and returns { ok: true } for valid input', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com',
        message: 'Hello, I have a question about the app.',
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockEmailSend).toHaveBeenCalledOnce();
  });

  it('sends to the configured from-email address', async () => {
    const app = createContactApp();
    await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'Testing the contact form properly.',
      }),
    });

    const call = mockEmailSend.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.to).toBe('hello@nutriapp.test');
    expect(call.replyTo).toBe('bob@example.com');
  });

  it('sanitises HTML in name and message before sending', async () => {
    const app = createContactApp();
    await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '<b>Hacker</b>',
        email: 'hacker@example.com',
        message: '<script>alert("xss")</script>This is my question about pricing.',
      }),
    });

    const call = mockEmailSend.mock.calls[0]![0] as Record<string, string>;
    expect(call.text).not.toContain('<b>');
    expect(call.text).not.toContain('<script>');
    expect(call.text).toContain('Hacker');
  });

  it('includes the sender name in the email subject', async () => {
    const app = createContactApp();
    await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie',
        email: 'charlie@example.com',
        message: 'Question about billing details here.',
      }),
    });

    const call = mockEmailSend.mock.calls[0]![0] as Record<string, string>;
    expect(call.subject).toContain('Charlie');
  });

  it('returns 500 when email service is not configured', async () => {
    delete process.env['RESEND_API_KEY'];
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dave',
        email: 'dave@example.com',
        message: 'Will this fail gracefully?',
      }),
    });
    expect(res.status).toBe(500);
  });

  it('returns 500 when Resend returns an error', async () => {
    mockEmailSend.mockResolvedValue({ error: new Error('Resend API down') });

    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eve',
        email: 'eve@example.com',
        message: 'Testing email failure path carefully.',
      }),
    });
    expect(res.status).toBe(500);
  });

  // ─── Validation — missing / invalid fields ──────────────────────────────────

  it('returns 400 for a missing name', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', message: 'Hello there, this is a test.' }),
    });
    expect(res.status).toBe(400);
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it('returns 400 for an empty name', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: 'test@example.com',
        message: 'Hello there, this is a test.',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a missing email', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Frank', message: 'Hello there, this is a test.' }),
    });
    expect(res.status).toBe(400);
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid email format', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Frank',
        email: 'not-an-email',
        message: 'Hello there, this is a test.',
      }),
    });
    expect(res.status).toBe(400);
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it('returns 400 for a missing message', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Grace', email: 'grace@example.com' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is shorter than 10 characters', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Grace', email: 'grace@example.com', message: 'Hi' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when message exceeds 2000 characters', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Spammer',
        email: 'spam@example.com',
        message: 'A'.repeat(2001),
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name exceeds 100 characters', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'N'.repeat(101),
        email: 'test@example.com',
        message: 'This is a valid message body for testing purposes.',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a completely empty body', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  // ─── Hostile input ──────────────────────────────────────────────────────────

  it('sends the email even when name is whitespace-only (Zod passes, sanitiser trims)', async () => {
    // Zod min(1) counts raw characters — '   ' passes (3 chars).
    // sanitiseTextServer then trims it to ''. The email is sent with an empty name.
    // This documents current behaviour; if stricter validation is needed, add
    // .trim().min(1) to the Zod schema in ContactFormSchema.
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '   ',
        email: 'attacker@example.com',
        message: 'Injecting whitespace-only name here.',
      }),
    });
    expect(res.status).toBe(200);
  });

  it('accepts max-length valid input without error', async () => {
    const app = createContactApp();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'N'.repeat(100),
        email: 'valid@example.com',
        message: 'M'.repeat(2000),
      }),
    });
    expect(res.status).toBe(200);
  });
});
