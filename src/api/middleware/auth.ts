import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@clerk/backend';

export type AuthVariables = { user: { id: string } | undefined };

// Clerk's RSA public key — allows JWT verification without any network calls.
// Derived from https://shining-aphid-30.clerk.accounts.dev/.well-known/jwks.json
// If Clerk rotates keys, update this from the JWKS endpoint above.
const CLERK_JWT_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsE8UXLvd/n7rq4wFiv/E
LTKpavdwSIBw/RZOw8vzofRJWlAp0I4Nejs4ggkRHgt9+yqXALdXQIK1aCGlhsVQ
KLNdYH3dv9vNbG3YCTETwr6bgsyyuEMM+39aHK3QWDbynXNMN9UupbJ4S2BVtq26
ToyoDHFIqChf/hzd78njoX4cSSR5P2Io90TamAL4YwkwYjQM+Jo1hBnhEb+ZGSjP
1XmeGUZ2AR4nDeHTS/5YYHk9gCimKlOaqzt2dXO9PumWf9ERYVTq5xKGrBBxgCou
J+Volv8dh+KZ/q/SsFtmiXQV+1cIhdtyVIBgFrZJCt8YWSPfKlsUvrRI2FKQgpkr
DwIDAQAB
-----END PUBLIC KEY-----`;

async function verifyBearer(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const payload = await verifyToken(token, {
      jwtKey: CLERK_JWT_KEY,
      // secretKey kept as belt-and-suspenders — verifyToken prefers jwtKey when both are set
      secretKey: process.env['CLERK_SECRET_KEY'],
    });
    return payload.sub ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[auth] token verification failed: ${msg}`);
    return null;
  }
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (c.get('user') !== undefined) {
    await next();
    return;
  }

  const userId = await verifyBearer(c.req.header('Authorization'));
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', { id: userId });
  await next();
});

export const optionalAuthMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const userId = await verifyBearer(c.req.header('Authorization'));
    c.set('user', userId ? { id: userId } : undefined);
    await next();
  },
);
