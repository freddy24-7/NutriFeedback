// Polyfills for Node 16 compatibility (project targets Node 20 via .nvmrc).
// On Node 18+, crypto.getRandomValues and globalThis.fetch are native.

const crypto = require('crypto');

// Vite 5 uses crypto.getRandomValues — not available on Node 16's built-in module.
if (!crypto.getRandomValues) {
  crypto.getRandomValues = (array) => crypto.webcrypto.getRandomValues(array);
}

// globalThis.crypto is used by better-auth and various other packages.
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}

// globalThis.fetch is required by @neondatabase/serverless and @upstash/redis.
// On Node 16 it doesn't exist natively; polyfill with node-fetch v2.
if (!globalThis.fetch) {
  const nodeFetch = require('node-fetch');
  globalThis.fetch = nodeFetch.default ?? nodeFetch;
  globalThis.Headers = nodeFetch.Headers;
  globalThis.Request = nodeFetch.Request;
  globalThis.Response = nodeFetch.Response;
}
