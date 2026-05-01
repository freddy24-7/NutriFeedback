import { describe, it, expect } from 'vitest';
import { confidenceColour, confidenceLabel } from '@/utils/confidence';

describe('confidenceColour', () => {
  it('returns brand colour for high confidence (>=0.7)', () => {
    expect(confidenceColour(1.0)).toContain('brand');
    expect(confidenceColour(0.7)).toContain('brand');
  });

  it('returns amber colour for medium confidence (0.4–0.69)', () => {
    expect(confidenceColour(0.69)).toContain('amber');
    expect(confidenceColour(0.4)).toContain('amber');
    expect(confidenceColour(0.5)).toContain('amber');
  });

  it('returns muted colour for low confidence (<0.4)', () => {
    expect(confidenceColour(0.39)).toContain('warm');
    expect(confidenceColour(0)).toContain('warm');
  });

  it('boundaries: 0.7 is high, 0.699 is medium', () => {
    expect(confidenceColour(0.7)).toContain('brand');
    expect(confidenceColour(0.699)).toContain('amber');
  });

  it('boundaries: 0.4 is medium, 0.399 is low', () => {
    expect(confidenceColour(0.4)).toContain('amber');
    expect(confidenceColour(0.399)).toContain('warm');
  });
});

describe('confidenceLabel', () => {
  it('returns "High confidence" for scores >=0.7', () => {
    expect(confidenceLabel(1.0)).toBe('High confidence');
    expect(confidenceLabel(0.7)).toBe('High confidence');
  });

  it('returns "Medium confidence" for scores 0.4–0.69', () => {
    expect(confidenceLabel(0.69)).toBe('Medium confidence');
    expect(confidenceLabel(0.4)).toBe('Medium confidence');
  });

  it('returns "Low confidence" for scores <0.4', () => {
    expect(confidenceLabel(0.39)).toBe('Low confidence');
    expect(confidenceLabel(0)).toBe('Low confidence');
  });
});
