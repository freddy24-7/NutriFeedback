import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

// Only import SDKs here — never import them anywhere else in the codebase.

export type AIRequest = {
  prompt: string;
  systemPrompt: string;
  language: 'en' | 'nl';
  forceGemini?: boolean;
};

export type AIResponse = {
  text: string;
  model: 'gemini' | 'anthropic';
};

/** Model id for `getGenerativeModel` — not the REST `models/...` path. */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

async function callGemini(req: AIRequest): Promise<AIResponse> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const modelId = process.env['GEMINI_MODEL']?.trim() || DEFAULT_GEMINI_MODEL;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: req.systemPrompt,
  });

  const result = await model.generateContent(req.prompt);
  const text = result.response.text();
  return { text, model: 'gemini' };
}

async function callAnthropic(req: AIRequest): Promise<AIResponse> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: req.systemPrompt,
    messages: [{ role: 'user', content: req.prompt }],
  });

  const block = message.content[0];
  const text = block?.type === 'text' ? block.text : '';
  return { text, model: 'anthropic' };
}

export async function generateAIResponse(req: AIRequest): Promise<AIResponse> {
  const preferGemini =
    (process.env['NODE_ENV'] === 'development' || req.forceGemini === true) &&
    Boolean(process.env['GEMINI_API_KEY']);

  if (preferGemini) {
    try {
      return await callGemini(req);
    } catch (err) {
      // Gemini quota / project billing issue — fall back to Anthropic silently
      console.warn('[AI] Gemini unavailable, using Anthropic:', (err as Error).message);
    }
  }

  return callAnthropic(req);
}

// Strip ```json ... ``` or ``` ... ``` fences that models sometimes add
// despite "return ONLY JSON" instructions.
export function stripJsonFences(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? (match[1] ?? text).trim() : text.trim();
}
