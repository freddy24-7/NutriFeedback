// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { assessProcessingLevel } from '@/lib/barcode/processingLevel';

describe('assessProcessingLevel', () => {
  it('returns 1 for a fresh fruit', () => {
    expect(assessProcessingLevel('apple')).toBe(1);
  });

  it('returns 1 for plain chicken breast', () => {
    expect(assessProcessingLevel('chicken breast')).toBe(1);
  });

  it('returns 1 for fresh-prefixed products', () => {
    expect(assessProcessingLevel('fresh spinach')).toBe(1);
  });

  it('returns 2 for olive oil', () => {
    expect(assessProcessingLevel('olive oil')).toBe(2);
  });

  it('returns 2 for flour', () => {
    expect(assessProcessingLevel('flour')).toBe(2);
  });

  it('returns 4 for a product with "chip" in the name', () => {
    expect(assessProcessingLevel('salted chips')).toBe(4);
  });

  it('returns 4 for energy drink', () => {
    expect(assessProcessingLevel('energy drink berry blast')).toBe(4);
  });

  it('returns 4 for instant noodles', () => {
    expect(assessProcessingLevel('instant noodles chicken flavour')).toBe(4);
  });

  it('returns 3 for an unrecognised processed food', () => {
    expect(assessProcessingLevel('canned tomato soup')).toBe(3);
  });

  it('is case-insensitive', () => {
    expect(assessProcessingLevel('CHIPS AND CRISPS')).toBe(4);
    expect(assessProcessingLevel('Fresh Salmon')).toBe(1);
  });
});
