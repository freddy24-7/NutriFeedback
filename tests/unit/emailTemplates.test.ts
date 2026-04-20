import { describe, it, expect } from 'vitest';
import { buildTipEmailText, buildTipEmailHtml } from '@/lib/email/templates';

const base = {
  userName: 'Alice',
  tipTextEn: 'Try to eat more vegetables.',
  tipTextNl: 'Probeer meer groenten te eten.',
  nutrientsFlagged: ['fibre', 'vitamin C'],
  severity: 'suggestion' as const,
  appUrl: 'https://nutriapp.app',
};

describe('buildTipEmailText', () => {
  it('uses English tip text when language is en', () => {
    const text = buildTipEmailText({ ...base, language: 'en' });
    expect(text).toContain('Try to eat more vegetables.');
    expect(text).not.toContain('Probeer meer groenten te eten.');
  });

  it('uses Dutch tip text when language is nl', () => {
    const text = buildTipEmailText({ ...base, language: 'nl' });
    expect(text).toContain('Probeer meer groenten te eten.');
    expect(text).not.toContain('Try to eat more vegetables.');
  });

  it('includes the app URL', () => {
    const text = buildTipEmailText({ ...base, language: 'en' });
    expect(text).toContain('https://nutriapp.app');
  });

  it('lists flagged nutrients when present', () => {
    const text = buildTipEmailText({ ...base, language: 'en' });
    expect(text).toContain('fibre, vitamin C');
  });

  it('omits nutrients section when nutrientsFlagged is null', () => {
    const text = buildTipEmailText({ ...base, language: 'en', nutrientsFlagged: null });
    expect(text).not.toContain('Nutrients to watch');
    expect(text).not.toContain('Voedingsstoffen om op te letten');
  });

  it('greets the user by name in English', () => {
    const text = buildTipEmailText({ ...base, language: 'en' });
    expect(text).toContain('Hi Alice,');
  });

  it('greets the user by name in Dutch', () => {
    const text = buildTipEmailText({ ...base, language: 'nl' });
    expect(text).toContain('Hallo Alice,');
  });

  it('includes severity label for important tips', () => {
    const text = buildTipEmailText({ ...base, language: 'en', severity: 'important' });
    expect(text).toContain('[Important]');
  });
});

describe('buildTipEmailHtml', () => {
  it('produces valid HTML with doctype', () => {
    const html = buildTipEmailHtml({ ...base, language: 'en' });
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('sets lang attribute to the requested language', () => {
    const htmlEn = buildTipEmailHtml({ ...base, language: 'en' });
    const htmlNl = buildTipEmailHtml({ ...base, language: 'nl' });
    expect(htmlEn).toContain('lang="en"');
    expect(htmlNl).toContain('lang="nl"');
  });

  it('uses Dutch tip text when language is nl', () => {
    const html = buildTipEmailHtml({ ...base, language: 'nl' });
    expect(html).toContain('Probeer meer groenten te eten.');
  });

  it('uses English tip text when language is en', () => {
    const html = buildTipEmailHtml({ ...base, language: 'en' });
    expect(html).toContain('Try to eat more vegetables.');
  });

  it('uses red accent for important severity', () => {
    const html = buildTipEmailHtml({ ...base, language: 'en', severity: 'important' });
    expect(html).toContain('#ef4444');
  });

  it('uses amber accent for suggestion severity', () => {
    const html = buildTipEmailHtml({ ...base, language: 'en', severity: 'suggestion' });
    expect(html).toContain('#f59e0b');
  });

  it('uses indigo accent for info severity', () => {
    const html = buildTipEmailHtml({ ...base, language: 'en', severity: 'info' });
    expect(html).toContain('#6366f1');
  });

  it('includes app URL as CTA link', () => {
    const html = buildTipEmailHtml({ ...base, language: 'en' });
    expect(html).toContain('href="https://nutriapp.app"');
  });

  it('omits nutrient row when nutrientsFlagged is null', () => {
    const html = buildTipEmailHtml({ ...base, language: 'en', nutrientsFlagged: null });
    expect(html).not.toContain('Nutrients to watch');
  });

  it('includes nutrient row when nutrientsFlagged has entries', () => {
    const html = buildTipEmailHtml({ ...base, language: 'en' });
    expect(html).toContain('fibre, vitamin C');
  });
});
