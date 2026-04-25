// @vitest-environment node
/**
 * Integration tests for POST /api/chat
 *
 * AI calls are mocked. DB operations hit the real Neon dev branch.
 * Rate limiting is mocked to always allow.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { db } from '@/lib/db/client';
import { chatbotSessions, unansweredQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createChatApp } from '../helpers/testApp';
import { seedUser, cleanupUser } from '../helpers/dbFixtures';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/redis/client', async () => {
  const { mockRedisModule } = await import('../helpers/mockRateLimiter');
  return mockRedisModule();
});

const { mockGenerateAIResponse } = vi.hoisted(() => ({
  mockGenerateAIResponse: vi.fn(),
}));

vi.mock('@/lib/ai/client', () => ({
  generateAIResponse: mockGenerateAIResponse,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_IP = '127.0.0.1';

function makeRequest(body: Record<string, unknown>, ip = TEST_IP) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

async function cleanupSessions(ipHash?: string) {
  if (ipHash) {
    await db.delete(chatbotSessions).where(eq(chatbotSessions.ipHash, ipHash));
  }
  // Clean up all unanswered questions from today (integration tests only)
  const today = new Date().toISOString().slice(0, 10);
  await db.delete(unansweredQuestions);
  await db.delete(chatbotSessions).where(eq(chatbotSessions.date, today));
}

afterEach(async () => {
  await cleanupSessions();
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/chat — FAQ matching', () => {
  it('returns FAQ answer for well-known question (no AI call)', async () => {
    const app = createChatApp();
    const res = await app.request(makeRequest({ message: 'What is NutriApp?', language: 'en' }));
    const body = (await res.json()) as { answer: string; source: string; faqId?: string };

    expect(res.status).toBe(200);
    expect(body.source).toBe('faq');
    expect(body.faqId).toBe('what-is-app');
    expect(body.answer).toBeTruthy();
    expect(mockGenerateAIResponse).not.toHaveBeenCalled();
  });

  it('returns Dutch FAQ answer when language is nl', async () => {
    const app = createChatApp();
    const res = await app.request(makeRequest({ message: 'Wat is NutriApp?', language: 'nl' }));
    const body = (await res.json()) as { answer: string; source: string };

    expect(res.status).toBe(200);
    expect(body.source).toBe('faq');
    expect(body.answer).toContain('NutriApp');
    expect(mockGenerateAIResponse).not.toHaveBeenCalled();
  });

  it('returns FAQ for barcode question', async () => {
    const app = createChatApp();
    const res = await app.request(
      makeRequest({ message: 'how does barcode scanning work', language: 'en' }),
    );
    const body = (await res.json()) as { source: string; faqId: string };

    expect(res.status).toBe(200);
    expect(body.source).toBe('faq');
    expect(body.faqId).toBe('barcode-scanning');
  });
});

describe('POST /api/chat — AI fallback', () => {
  it('calls AI when no FAQ match and returns answer', async () => {
    mockGenerateAIResponse.mockResolvedValueOnce({ text: 'AI says hello!', creditsUsed: 0 });

    const app = createChatApp();
    const res = await app.request(
      makeRequest({ message: 'What is the weather like today?', language: 'en' }),
    );
    const body = (await res.json()) as { answer: string; source: string };

    expect(res.status).toBe(200);
    expect(body.source).toBe('ai');
    expect(body.answer).toBe('AI says hello!');
    expect(mockGenerateAIResponse).toHaveBeenCalledOnce();

    // Verify forceGemini was passed
    const callArgs = mockGenerateAIResponse.mock.calls[0]![0] as { forceGemini: boolean };
    expect(callArgs.forceGemini).toBe(true);
  });

  it('logs unanswered question to DB on AI fallback', async () => {
    mockGenerateAIResponse.mockResolvedValueOnce({ text: 'AI says hello!', creditsUsed: 0 });

    const app = createChatApp();
    const question = `Integration test question ${Date.now()}`;
    await app.request(makeRequest({ message: question, language: 'en' }));

    const rows = await db
      .select()
      .from(unansweredQuestions)
      .where(eq(unansweredQuestions.question, question.slice(0, 500)));

    expect(rows).toHaveLength(1);
    expect(rows[0]!.language).toBe('en');
  });

  it('does not log unanswered question on FAQ match', async () => {
    const beforeCount = await db
      .select()
      .from(unansweredQuestions)
      .then((rows) => rows.length);

    const app = createChatApp();
    await app.request(makeRequest({ message: 'What is NutriApp?', language: 'en' }));

    const afterCount = await db
      .select()
      .from(unansweredQuestions)
      .then((rows) => rows.length);

    expect(afterCount).toBe(beforeCount);
    expect(mockGenerateAIResponse).not.toHaveBeenCalled();
  });
});

describe('POST /api/chat — session tracking', () => {
  it('creates a chatbot_sessions row on first message', async () => {
    const uniqueIp = `10.0.${Date.now() % 255}.1`;
    const app = createChatApp();

    const res = await app.request(
      makeRequest({ message: 'What is NutriApp?', language: 'en' }, uniqueIp),
    );
    expect(res.status).toBe(200);

    const sessions = await db
      .select()
      .from(chatbotSessions)
      .where(eq(chatbotSessions.date, new Date().toISOString().slice(0, 10)));

    const matchingSession = sessions.find((s) => s.messagesToday >= 1);
    expect(matchingSession).toBeDefined();
  });

  it('links session to userId when authenticated', async () => {
    const userId = `test-chat-${crypto.randomUUID()}`;
    await seedUser({ id: userId, email: `chat-${Date.now()}@example.com`, name: 'Chat Test' });

    try {
      const app = createChatApp(userId);
      const today = new Date().toISOString().slice(0, 10);

      await app.request(makeRequest({ message: 'What is NutriApp?', language: 'en' }));

      const rows = await db.select().from(chatbotSessions).where(eq(chatbotSessions.date, today));

      const userSession = rows.find((r) => r.userId === userId);
      expect(userSession).toBeDefined();
    } finally {
      await cleanupUser(userId);
    }
  });
});

describe('POST /api/chat — validation', () => {
  it('returns 400 when message is missing', async () => {
    const app = createChatApp();
    const res = await app.request(makeRequest({ language: 'en' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is empty string', async () => {
    const app = createChatApp();
    const res = await app.request(makeRequest({ message: '', language: 'en' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid language', async () => {
    const app = createChatApp();
    const res = await app.request(makeRequest({ message: 'hello', language: 'fr' }));
    expect(res.status).toBe(400);
  });

  it('defaults language to en when omitted', async () => {
    const app = createChatApp();
    const res = await app.request(makeRequest({ message: 'What is NutriApp?' }));
    // Should succeed — default language 'en' should match FAQ
    expect(res.status).toBe(200);
  });

  it('returns 400 when message exceeds 500 characters', async () => {
    const app = createChatApp();
    const res = await app.request(makeRequest({ message: 'a'.repeat(501), language: 'en' }));
    expect(res.status).toBe(400);
  });
});
