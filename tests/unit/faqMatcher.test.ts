import { describe, it, expect } from 'vitest';
import { matchFaq } from '@/utils/faqMatcher';

describe('matchFaq', () => {
  describe('English', () => {
    it('matches exact question', () => {
      const result = matchFaq('What is NutriApp?', 'en');
      expect(result).not.toBeNull();
      expect(result!.entry.id).toBe('what-is-app');
    });

    it('matches paraphrased question', () => {
      const result = matchFaq('how does barcode scanning work', 'en');
      expect(result).not.toBeNull();
      expect(result!.entry.id).toBe('barcode-scanning');
    });

    it('matches keyword-driven question', () => {
      const result = matchFaq('Is it free?', 'en');
      expect(result).not.toBeNull();
      expect(result!.entry.id).toBe('is-it-free');
    });

    it('matches privacy question', () => {
      const result = matchFaq('Is my data safe and private?', 'en');
      expect(result).not.toBeNull();
      expect(result!.entry.id).toBe('data-privacy');
    });

    it('returns null for completely unrelated query', () => {
      const result = matchFaq('xqzjklmvwp', 'en');
      expect(result).toBeNull();
    });

    it('returns null for empty-ish noise', () => {
      const result = matchFaq('aaaaaaaaaa', 'en');
      expect(result).toBeNull();
    });

    it('returns a score between 0 and 1', () => {
      const result = matchFaq('What is NutriApp?', 'en');
      expect(result!.score).toBeGreaterThan(0);
      expect(result!.score).toBeLessThanOrEqual(1);
    });
  });

  describe('Dutch', () => {
    it('matches Dutch question', () => {
      const result = matchFaq('Wat is NutriApp?', 'nl');
      expect(result).not.toBeNull();
      expect(result!.entry.id).toBe('what-is-app');
    });

    it('matches Dutch paraphrase', () => {
      const result = matchFaq('is het gratis', 'nl');
      expect(result).not.toBeNull();
      expect(result!.entry.id).toBe('is-it-free');
    });

    it('returns null for nonsense in Dutch mode', () => {
      const result = matchFaq('xqzjklmvwp', 'nl');
      expect(result).toBeNull();
    });
  });

  describe('answer content', () => {
    it('provides English answer for EN match', () => {
      const result = matchFaq('when do I get ai tips', 'en');
      expect(result).not.toBeNull();
      expect(result!.entry.answer_en).toBeTruthy();
      expect(result!.entry.answer_nl).toBeTruthy();
    });
  });
});
