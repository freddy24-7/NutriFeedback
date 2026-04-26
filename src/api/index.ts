import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from './create-app';

// Disable Vercel's body pre-parsing so we can read the raw stream.
// Required for correct Stripe webhook signature verification and for
// passing the unmodified body to Better Auth.
export const config = { api: { bodyParser: false } };

const app = createApiApp();

// Explicit Node.js handler — Vercel detects two declared parameters and
// uses the legacy (req, res) calling convention, so we must write to res.
// Using handle(app) from hono/vercel returns Promise<Response> that Vercel
// never reads in legacy mode, leaving the connection open until timeout.
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const proto = header(req.headers['x-forwarded-proto']) ?? 'https';
  const host =
    header(req.headers['x-forwarded-host']) ?? header(req.headers['host']) ?? 'localhost';
  const url = `${proto}://${host}${req.url ?? '/'}`;

  const webHeaders = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') webHeaders.set(k, v);
    else if (Array.isArray(v)) v.forEach((s) => webHeaders.append(k, s));
  }

  let body: Uint8Array | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', resolve);
      req.on('error', reject);
    });
    if (chunks.length > 0) body = Buffer.concat(chunks);
  }

  const response = await app.fetch(
    new Request(url, { method: req.method ?? 'GET', headers: webHeaders, ...(body && { body }) }),
  );

  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await response.arrayBuffer()));
}

function header(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
