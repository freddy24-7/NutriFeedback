import { GoogleGenerativeAI } from '@google/generative-ai';

// Only import the Gemini SDK here — never import it anywhere else in the codebase.

export type AIRequest = {
  prompt: string;
  systemPrompt: string;
  language: 'en' | 'nl';
};

export type AIResponse = {
  text: string;
  model: 'gemini';
};

/** Primary model id — matches Gemini API names without the `models/` prefix (see ListModels). */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Extra models to try in order if the primary fails (503/429/quota). Different models often have
 * separate quota buckets; avoid stopping after one fallback that shows free-tier `limit: 0`.
 */
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-pro',
] as const;

function resolvedGeminiModelId(): string {
  const raw = process.env['GEMINI_MODEL']?.trim();
  if (raw !== undefined && raw !== '') {
    return raw.startsWith('models/') ? raw.slice('models/'.length) : raw;
  }
  return DEFAULT_GEMINI_MODEL;
}

function geminiModelCandidates(primary: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [primary, ...GEMINI_FALLBACK_MODELS]) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

async function callGeminiModel(req: AIRequest, modelId: string): Promise<AIResponse> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: req.systemPrompt,
  });

  const result = await model.generateContent(req.prompt);
  const text = result.response.text();
  return { text, model: 'gemini' };
}

async function callGemini(req: AIRequest): Promise<AIResponse> {
  const primary = resolvedGeminiModelId();
  const candidates = geminiModelCandidates(primary);
  let lastErr: unknown;
  for (const modelId of candidates) {
    try {
      return await callGeminiModel(req, modelId);
    } catch (err) {
      lastErr = err;
      const snippet = ((err as Error).message ?? '').slice(0, 160);
      console.warn(`[AI] ${modelId} failed — ${snippet}${snippet.length >= 160 ? '…' : ''}`);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** All AI features use Google Gemini only (dev and prod). Requires `GEMINI_API_KEY`. */
export async function generateAIResponse(req: AIRequest): Promise<AIResponse> {
  return callGemini(req);
}

// Strip ```json ... ``` or ``` ... ``` fences that models sometimes add
// despite "return ONLY JSON" instructions.
export function stripJsonFences(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? (match[1] ?? text).trim() : text.trim();
}
