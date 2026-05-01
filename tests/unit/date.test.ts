import { describe, it, expect } from 'vitest';
import { todayISO, formatDate } from '@/utils/date';

describe('todayISO', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches today's date", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(todayISO()).toBe(today);
  });
});

describe('formatDate', () => {
  it('formats a date in English with weekday, month, day, year', () => {
    // 2026-01-05 is a Monday
    const result = formatDate('2026-01-05', 'en');
    expect(result).toContain('2026');
    expect(result).toContain('January');
    expect(result).toContain('5');
  });

  it('formats a date in Dutch locale', () => {
    const result = formatDate('2026-01-05', 'nl');
    expect(result).toContain('2026');
    // Dutch month name
    expect(result).toContain('januari');
  });

  it('returns the raw string when segments are undefined (too few dashes)', () => {
    // "2026" has no dashes — split produces one element, month/day are undefined
    expect(formatDate('2026', 'en')).toBe('2026');
  });

  it('handles single-digit day correctly', () => {
    const result = formatDate('2026-03-07', 'en');
    expect(result).toContain('7');
  });

  it('handles month boundary dates', () => {
    const result = formatDate('2026-12-31', 'en');
    expect(result).toContain('December');
    expect(result).toContain('31');
  });
});
