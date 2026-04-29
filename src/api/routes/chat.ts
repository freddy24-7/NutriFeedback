import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@/lib/db/client';
import { chatbotSessions, unansweredQuestions } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { generateAIResponse } from '@/lib/ai/client';
import { CHAT_SYSTEM, CHAT_PROMPT } from '@/lib/ai/prompts';
import { matchFaq } from '@/utils/faqMatcher';
import { rateLimits } from '@/lib/redis/client';
import { ipHashIdentifier } from '../middleware/rateLimit';
import { sanitiseForPrompt } from '@/api/middleware/sanitise';
import { ChatRequestSchema } from '@/types/api';
import { type AuthVariables } from '../middleware/auth';

const chatRoutes = new Hono<{ Variables: AuthVariables }>();

chatRoutes.post('/', zValidator('json', ChatRequestSchema), async (c) => {
  const { message, language } = c.req.valid('json');

  // Determine authenticated user (optional — chat is public)
  const user = c.get('user');

  // Rate limit: authenticated users get 20/day, anonymous users get 5/day
  const ipHash = ipHashIdentifier(c);
  const identifier = user?.id ?? ipHash;
  const limiter = user ? rateLimits.chatAuth : rateLimits.chatAnon;

  const { success } = await limiter.limit(identifier);
  if (!success) {
    return c.json({ error: 'Rate limit exceeded — try again tomorrow' }, 429);
  }

  // Track session in DB (analytics, not rate limiting)
  const today = new Date().toISOString().slice(0, 10);
  const existingSession = await db
    .select()
    .from(chatbotSessions)
    .where(and(eq(chatbotSessions.ipHash, ipHash), eq(chatbotSessions.date, today)))
    .then((rows) => rows[0]);

  if (existingSession) {
    await db
      .update(chatbotSessions)
      .set({ messagesToday: existingSession.messagesToday + 1 })
      .where(eq(chatbotSessions.id, existingSession.id));
  } else {
    await db.insert(chatbotSessions).values({
      ipHash,
      userId: user?.id ?? null,
      messagesToday: 1,
      date: today,
    });
  }

  // FAQ match first — no AI cost if we have an answer
  const faqMatch = matchFaq(message, language);
  if (faqMatch !== null) {
    const answer = language === 'nl' ? faqMatch.entry.answer_nl : faqMatch.entry.answer_en;

    return c.json({
      answer,
      source: 'faq' as const,
      faqId: faqMatch.entry.id,
    });
  }

  // No FAQ match — Gemini (same provider as all other AI routes)
  const safe = sanitiseForPrompt(message);
  const aiResponse = await generateAIResponse({
    systemPrompt: CHAT_SYSTEM(language),
    prompt: CHAT_PROMPT(safe),
    language,
  });

  // Log unanswered question so we can expand the FAQ later
  await db.insert(unansweredQuestions).values({ question: message.slice(0, 500), language });

  return c.json({ answer: aiResponse.text, source: 'ai' as const });
});

export { chatRoutes };
