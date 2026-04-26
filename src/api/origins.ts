/**
 * Dev-friendly origins: allow both localhost and 127.0.0.1 when the configured URL uses one of them.
 */
export function devAppOrigins(primaryUrl: string): string[] {
  const trimmed = primaryUrl.replace(/\/$/, '');
  const out = new Set<string>([trimmed]);
  if (trimmed.includes('://localhost')) {
    out.add(trimmed.replace('://localhost', '://127.0.0.1'));
  }
  if (trimmed.includes('://127.0.0.1')) {
    out.add(trimmed.replace('://127.0.0.1', '://localhost'));
  }
  return [...out];
}

/**
 * CORS + Better Auth `trustedOrigins` for API:
 * - `VITE_APP_URL` (canonical app URL, set in Vercel for Production)
 * - `VERCEL_URL` (auto-set on Vercel — preview + production deployment host; avoids auth/CORS failures on `*.vercel.app` when env is incomplete)
 */
export function corsAllowedOrigins(): string[] {
  const set = new Set<string>();

  const vite = process.env['VITE_APP_URL']?.replace(/\/$/, '');
  if (vite !== undefined && vite !== '') {
    for (const o of devAppOrigins(vite)) {
      set.add(o);
    }
  }

  const vercel = process.env['VERCEL_URL']?.trim();
  if (vercel !== undefined && vercel !== '') {
    const origin = vercel.startsWith('http') ? vercel.replace(/\/$/, '') : `https://${vercel}`;
    set.add(origin);
  }

  if (set.size === 0) {
    for (const o of devAppOrigins('http://localhost:5173')) {
      set.add(o);
    }
  }

  return [...set];
}
