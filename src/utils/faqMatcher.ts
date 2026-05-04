import Fuse from 'fuse.js';
import faqDataRaw from '../../public/faq/faq.json';

export type FaqEntry = {
  id: string;
  category: string;
  keywords: string[];
  question_en: string;
  question_nl: string;
  answer_en: string;
  answer_nl: string;
};

export type FaqMatch = {
  entry: FaqEntry;
  score: number;
};

const faqData = faqDataRaw as { faqs: FaqEntry[]; threshold: number };

const faqs = faqData.faqs as FaqEntry[];
const SCORE_THRESHOLD = 1 - (faqData.threshold as number); // Fuse uses 0=perfect, 1=worst

const fuseEn = new Fuse(faqs, {
  keys: [
    { name: 'question_en', weight: 2 },
    { name: 'keywords', weight: 1 },
  ],
  includeScore: true,
  threshold: SCORE_THRESHOLD,
  ignoreLocation: true,
});

const fuseNl = new Fuse(faqs, {
  keys: [
    { name: 'question_nl', weight: 2 },
    { name: 'keywords', weight: 1 },
  ],
  includeScore: true,
  threshold: SCORE_THRESHOLD,
  ignoreLocation: true,
});

export function matchFaq(question: string, language: 'en' | 'nl'): FaqMatch | null {
  const fuse = language === 'nl' ? fuseNl : fuseEn;
  const results = fuse.search(question);

  if (results.length === 0) return null;

  const best = results[0]!;
  return {
    entry: best.item,
    score: 1 - (best.score ?? 1), // convert to 0=worst, 1=perfect
  };
}
