import { Hono } from 'hono';
import { handle } from 'hono/vercel';

// Stub — registers this path as a Vercel Serverless Function pre-build.
// At runtime api/index.js (esbuild bundle of src/api/index.ts) takes
// precedence over this .ts file. Vercel prefers .js when both exist.
const app = new Hono().basePath('/api');
export default handle(app);
