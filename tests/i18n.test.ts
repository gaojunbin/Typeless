import { describe, expect, it } from 'vitest';
import { catalog, translate, type MessageKey } from '../src/renderer/i18n';
import { languages } from '../src/shared/contracts';

const cjk = /[一-鿿]/;
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

describe('interface copy catalogue', () => {
  const keys = Object.keys(catalog.zh) as MessageKey[];

  it('holds every key in both languages with non-empty text', () => {
    expect(keys.length).toBeGreaterThan(100);
    for (const language of languages) {
      expect(Object.keys(catalog[language]).sort()).toEqual([...keys].sort());
      for (const key of keys) expect(catalog[language][key].trim(), `${language}:${key}`).not.toBe('');
    }
  });

  it('keeps the English text free of Chinese characters apart from the language name itself', () => {
    for (const key of keys) {
      if (key === 'common.language.zh') continue;
      expect(catalog.en[key], key).not.toMatch(cjk);
    }
  });

  it('uses the same placeholders in both languages', () => {
    for (const key of keys) expect(placeholders(catalog.en[key]), key).toEqual(placeholders(catalog.zh[key]));
  });

  it('fills placeholders and leaves unknown ones untouched', () => {
    expect(translate('zh', 'common.shell.newVersion', { version: '9.0.0' })).toBe('有新版本 9.0.0');
    expect(translate('en', 'common.shell.newVersion', { version: '9.0.0' })).toBe('Version 9.0.0 available');
    expect(translate('en', 'common.shell.newVersion', {})).toBe('Version {version} available');
    expect(translate('en', 'common.page.basic')).toBe('Settings');
  });
});
