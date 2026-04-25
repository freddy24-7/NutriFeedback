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

// globalThis.fetch is required by @neondatabase/serverless, @upstash/redis, etc.
// Use undici — the same fetch implementation as Node 18/20 native fetch.
// node-fetch v2 has DNS resolution issues on some macOS environments.
if (!globalThis.fetch) {
  const undici = require('undici');
  globalThis.fetch = undici.fetch;
  globalThis.Headers = undici.Headers;
  globalThis.Request = undici.Request;
  globalThis.Response = undici.Response;
  globalThis.FormData = undici.FormData;
}
