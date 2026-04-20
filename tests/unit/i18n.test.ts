import { describe, it, expect } from 'vitest';
import en from '../../public/locales/en/common.json';
import nl from '../../public/locales/nl/common.json';

type JsonObject = { [key: string]: JsonValue };
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

function getAllKeys(obj: JsonObject, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null && !Array.isArray(v)
      ? getAllKeys(v as JsonObject, fullKey)
      : [fullKey];
  });
}

describe('i18n completeness', () => {
  it('NL file has all keys present in EN file', () => {
    const enKeys = getAllKeys(en as JsonObject);
    const nlKeys = new Set(getAllKeys(nl as JsonObject));
    const missing = enKeys.filter((k) => !nlKeys.has(k));
    expect(missing, `Missing NL keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('EN file has all keys present in NL file (no orphaned NL keys)', () => {
    const nlKeys = getAllKeys(nl as JsonObject);
    const enKeys = new Set(getAllKeys(en as JsonObject));
    const extra = nlKeys.filter((k) => !enKeys.has(k));
    expect(extra, `Extra NL keys not in EN: ${extra.join(', ')}`).toEqual([]);
  });

  it('no [TODO-NL] placeholder values in NL file on main branch', () => {
    const nlStr = JSON.stringify(nl);
    // Allow [TODO-NL] during development but this test gates main branch merges
    const todoCount = (nlStr.match(/\[TODO-NL\]/g) ?? []).length;
    expect(todoCount, '[TODO-NL] entries found in nl/common.json').toBe(0);
  });
});
