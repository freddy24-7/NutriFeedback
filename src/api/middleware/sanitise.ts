// Server-side sanitisation — no DOMPurify (Node/Edge runtime).
// Applied before every DB write and AI prompt insertion.

export function sanitiseTextServer(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Expected string');
  return (
    input
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') // strip script blocks with content
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '') // strip style blocks with content
      .replace(/<[^>]*>/g, '') // strip remaining HTML tags
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, '') // strip control characters
      .trim()
      .slice(0, 2000)
  );
}

export function sanitiseForPrompt(raw: string): string {
  const clean = sanitiseTextServer(raw);
  return `<user_input>${clean}</user_input>`;
}
