import DOMPurify from 'dompurify';

// Client-side sanitisation — run before form submit.
// Server-side equivalent lives in src/api/middleware/sanitise.ts.

export function sanitiseText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim().slice(0, 2000);
}

export function sanitiseForPrompt(input: string): string {
  return `<user_input>${sanitiseText(input)}</user_input>`;
}
