const AUTH_TIMEOUT = 'AUTH_TIMEOUT';

export const AUTH_REQUEST_TIMEOUT_MS = 45_000;

/**
 * Wraps Better Auth client calls so a hung dev proxy / network does not leave the form stuck forever.
 */
export async function withAuthRequestTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(AUTH_TIMEOUT)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function isAuthTimeoutError(e: unknown): boolean {
  return e instanceof Error && e.message === AUTH_TIMEOUT;
}
