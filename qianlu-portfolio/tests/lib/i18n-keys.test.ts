import { describe, expect, it } from 'vitest';

import { resources } from '@/locales';

const LANGS = ['zh', 'en', 'fr', 'ru', 'es', 'ar'] as const;
const NAMESPACES = ['common', 'home', 'settings', 'detail'] as const;

type Json = { [key: string]: Json | string };

function flatten(
  value: Json | string,
  prefix = '',
  out = new Map<string, string>()
): Map<string, string> {
  if (typeof value === 'string') {
    out.set(prefix, value);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

describe('六语翻译资源键一致性', () => {
  for (const ns of NAMESPACES) {
    it(`${ns} 命名空间六种语言键集合完全一致`, () => {
      const base = flatten(resources.zh[ns] as Json);
      expect(base.size).toBeGreaterThan(0);
      for (const lang of LANGS) {
        const target = flatten(resources[lang][ns] as Json);
        const missing = [...base.keys()].filter((key) => !target.has(key));
        const extra = [...target.keys()].filter((key) => !base.has(key));
        expect({ lang, missing, extra }).toEqual({ lang, missing: [], extra: [] });
      }
    });

    it(`${ns} 命名空间无空文案`, () => {
      for (const lang of LANGS) {
        for (const [key, value] of flatten(resources[lang][ns] as Json)) {
          expect(value.trim(), `${lang}:${ns}:${key}`).not.toBe('');
        }
      }
    });
  }

  it('插值占位符在各语言间保持一致', () => {
    const placeholders = (text: string) =>
      (text.match(/\{\{[^}]+\}\}|<\/?[a-z0-9]+\/?>/g) ?? []).sort().join('|');
    for (const ns of NAMESPACES) {
      const base = flatten(resources.zh[ns] as Json);
      for (const lang of LANGS) {
        const target = flatten(resources[lang][ns] as Json);
        for (const [key, value] of base) {
          expect(placeholders(target.get(key) ?? ''), `${lang}:${ns}:${key}`).toBe(
            placeholders(value)
          );
        }
      }
    }
  });
});
