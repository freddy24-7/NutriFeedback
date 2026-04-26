import { Hono } from 'hono';
import { handle } from 'hono/vercel';

// Stub — registers this path as a Vercel Serverless Function pre-build.
// At runtime api/index.js (esbuild bundle of src/api/index.ts) takes
// precedence over this .ts file. Vercel prefers .js when both exist.
//
// bodyParser: false must be here (not just in src/api/index.ts) because
// Vercel reads the config export from the REGISTERED source file before
// deciding whether to pre-parse the request body. Without it, Vercel
// consumes the stream and req.on('end') never fires → FUNCTION_INVOCATION_TIMEOUT.
export const config = { maxDuration: 60, api: { bodyParser: false } };

const app = new Hono().basePath('/api');
export default handle(app);
