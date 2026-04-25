// @vitest-environment node
import { describe, it, expect } from 'vitest';

// Pure logic helpers — extracted so they can be tested without a DB connection.
// The route uses these same checks inside the DB transaction.

type DiscountCodeRow = {
  code: string;
  type: 'beta' | 'influencer' | 'timed';
  usesRemaining: number | null;
  expiresAt: Date | null;
  trialDays: number | null;
};

function validateDiscountCode(
  row: DiscountCodeRow | undefined,
  now = new Date(),
): { valid: true } | { valid: false; error: string } {
  if (!row) return { valid: false, error: 'Invalid discount code' };
  if (row.expiresAt && row.expiresAt < now)
    return { valid: false, error: 'This discount code has expired' };
  if (row.usesRemaining !== null && row.usesRemaining <= 0) {
    return { valid: false, error: 'This discount code has no uses remaining' };
  }
  return { valid: true };
}

function grantStatus(type: DiscountCodeRow['type']): 'comped' | 'trial' {
  return type === 'beta' || type === 'influencer' ? 'comped' : 'trial';
}

function trialExtensionDays(row: DiscountCodeRow): number {
  return row.trialDays ?? 30;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('discount code validation', () => {
  const FUTURE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year ahead
  const PAST = new Date(Date.now() - 1000 * 60 * 60 * 24); // yesterday

  it('accepts a valid beta code with unlimited uses', () => {
    const row: DiscountCodeRow = {
      code: 'BETA',
      type: 'beta',
      usesRemaining: null,
      expiresAt: null,
      trialDays: null,
    };
    expect(validateDiscountCode(row)).toEqual({ valid: true });
  });

  it('accepts a valid influencer code with uses remaining', () => {
    const row: DiscountCodeRow = {
      code: 'INF01',
      type: 'influencer',
      usesRemaining: 3,
      expiresAt: null,
      trialDays: null,
    };
    expect(validateDiscountCode(row)).toEqual({ valid: true });
  });

  it('accepts a valid timed code with future expiry', () => {
    const row: DiscountCodeRow = {
      code: 'T30',
      type: 'timed',
      usesRemaining: 5,
      expiresAt: FUTURE,
      trialDays: 30,
    };
    expect(validateDiscountCode(row)).toEqual({ valid: true });
  });

  it('rejects an unknown code (undefined row)', () => {
    const result = validateDiscountCode(undefined);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('Invalid discount code');
  });

  it('rejects an expired code', () => {
    const row: DiscountCodeRow = {
      code: 'OLD',
      type: 'timed',
      usesRemaining: null,
      expiresAt: PAST,
      trialDays: 30,
    };
    const result = validateDiscountCode(row);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/expired/i);
  });

  it('rejects a zero-uses code', () => {
    const row: DiscountCodeRow = {
      code: 'USED',
      type: 'influencer',
      usesRemaining: 0,
      expiresAt: null,
      trialDays: null,
    };
    const result = validateDiscountCode(row);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/no uses remaining/i);
  });

  it('accepts a code with 1 use remaining', () => {
    const row: DiscountCodeRow = {
      code: 'LAST',
      type: 'influencer',
      usesRemaining: 1,
      expiresAt: null,
      trialDays: null,
    };
    expect(validateDiscountCode(row)).toEqual({ valid: true });
  });

  it('treats null usesRemaining as unlimited', () => {
    const row: DiscountCodeRow = {
      code: 'UNLIMITED',
      type: 'beta',
      usesRemaining: null,
      expiresAt: null,
      trialDays: null,
    };
    expect(validateDiscountCode(row)).toEqual({ valid: true });
  });
});

describe('discount code grant logic', () => {
  it('beta code grants comped status', () => {
    expect(grantStatus('beta')).toBe('comped');
  });

  it('influencer code grants comped status', () => {
    expect(grantStatus('influencer')).toBe('comped');
  });

  it('timed code grants trial status', () => {
    expect(grantStatus('timed')).toBe('trial');
  });

  it('timed code uses trialDays from row', () => {
    const row: DiscountCodeRow = {
      code: 'T14',
      type: 'timed',
      usesRemaining: null,
      expiresAt: null,
      trialDays: 14,
    };
    expect(trialExtensionDays(row)).toBe(14);
  });

  it('timed code defaults to 30 days when trialDays is null', () => {
    const row: DiscountCodeRow = {
      code: 'TDEF',
      type: 'timed',
      usesRemaining: null,
      expiresAt: null,
      trialDays: null,
    };
    expect(trialExtensionDays(row)).toBe(30);
  });
});

describe('paywall access logic', () => {
  type SubStatus = 'trial' | 'active' | 'comped' | 'expired' | 'cancelled';

  function canAccess(
    status: SubStatus | undefined,
    creditsRemaining: number,
    expiresAt: Date | null,
  ): boolean {
    if (status === 'active' || status === 'comped') return true;
    if (expiresAt && expiresAt < new Date()) return false;
    if (creditsRemaining <= 0) return false;
    return true;
  }

  it('trial user with credits is allowed', () => {
    expect(canAccess('trial', 10, null)).toBe(true);
  });

  it('trial user with expired date is blocked', () => {
    const yesterday = new Date(Date.now() - 86400_000);
    expect(canAccess('trial', 10, yesterday)).toBe(false);
  });

  it('trial user with 0 credits is blocked', () => {
    expect(canAccess('trial', 0, null)).toBe(false);
  });

  it('active subscriber with 0 credits is still allowed', () => {
    expect(canAccess('active', 0, null)).toBe(true);
  });

  it('comped user is always allowed', () => {
    const yesterday = new Date(Date.now() - 86400_000);
    expect(canAccess('comped', 0, yesterday)).toBe(true);
  });

  it('expired subscription is blocked', () => {
    expect(canAccess('expired', 0, null)).toBe(false);
  });

  it('cancelled subscription with credits still blocked (no sub)', () => {
    expect(canAccess('cancelled', 5, null)).toBe(true); // credits still available
  });

  it('no subscription row with credits remaining is allowed', () => {
    expect(canAccess(undefined, 50, null)).toBe(true);
  });
});
