import type { Context } from 'hono';
import type { AuthVariables } from '@/api/middleware/auth';

/** Extracts the verified userId from Hono context — throws 401 if absent. */
export function requireAuth(c: Context<{ Variables: AuthVariables }>): string {
  const user = c.get('user');
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user.id;
}
