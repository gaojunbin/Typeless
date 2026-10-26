import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../src/shared/contracts';
import { asrHints, cleanupVocabulary, mentions, mergeVariants, parseVocabulary, rankVocabulary, usedEntryIds, vocabularyInput } from '../src/core/vocabulary';

const entry = (term: string, patch: Partial<VocabularyEntry> = {}): VocabularyEntry => ({ id: term, term, soundsLike: [], hits: 0, lastUsedAt: 0, createdAt: 1, updatedAt: 1, ...patch });

describe('vocabulary input', () => {
  it('trims words, drops blank and repeated variants and those equal to the term', () => {
    expect(vocabularyInput({ term: '  Claude \n Code ', soundsLike: [' 云 ', '', 'claude code', '云', 'CLOUD', 'cloud'] }))
      .toEqual({ term: 'Claude Code', soundsLike: ['云', 'CLOUD'] });
    expect(vocabularyInput({ id: 'a', term: 'Typeless', soundsLike: [] })).toEqual({ id: 'a', term: 'Typeless', soundsLike: [] });
  });
  it('rejects empty, long, multi-entry and malformed input', () => {
    expect(() => vocabularyInput({ term: '  ', soundsLike: [] })).toThrow('1–64');
    expect(() => vocabularyInput({ term: 'x'.repeat(65), soundsLike: [] })).toThrow('1–64');
    expect(() => vocabularyInput({ term: 'Claude', soundsLike: Array.from({ length: 9 }, (_, index) => `v${index}`) })).toThrow('at most 8');
    expect(() => vocabularyInput({ term: 'Claude', soundsLike: [3] })).toThrow('must be text');
    expect(() => vocabularyInput({ term: 'Claude' })).toThrow('short list');
    expect(() => vocabularyInput({ term: 'a\u0007b', soundsLike: [] })).toThrow('1–64');
    expect(() => vocabularyInput(['Claude'])).toThrow('Invalid vocabulary entry.');
  });
  it('merges variants and keeps the newest when the list is full', () => {
    expect(mergeVariants(['云', '克劳德'], ['克劳德', 'cloud'], 'Claude')).toEqual(['云', '克劳德', 'cloud']);
    const full = Array.from({ length: 8 }, (_, index) => `v${index}`);
    expect(mergeVariants(full, ['new'], 'Claude')).toEqual([...full.slice(1), 'new']);
  });
  it('reads saved entries strictly', () => {
    const saved = [entry('Claude', { soundsLike: ['云'], hits: 2, lastUsedAt: 5 })];
    expect(parseVocabulary(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(() => parseVocabulary({})).toThrow('Invalid saved vocabulary.');
    expect(() => parseVocabulary([{ ...saved[0], hits: -1 }])).toThrow('Invalid saved vocabulary.');
    expect(() => parseVocabulary([{ ...saved[0], id: '' }])).toThrow('Invalid saved vocabulary.');
    expect(() => parseVocabulary([{ ...saved[0], term: '' }])).toThrow('Invalid saved vocabulary.');
    expect(() => parseVocabulary(['Claude'])).toThrow('Invalid saved vocabulary.');
  });
});

describe('vocabulary matching and selection', () => {
  it('matches case-insensitively without splitting Latin words', () => {
    expect(mentions('我用CLAUDE写的', 'Claude')).toBe(true);
    expect(mentions('The claudes are here', 'Claude')).toBe(false);
    expect(mentions('cloudy weather, then cloud', 'cloud')).toBe(true);
    expect(mentions('cloudy weather', 'cloud')).toBe(false);
    expect(mentions('阿里云服务器', '云')).toBe(true);
    expect(mentions('ＧＰＴ-5 is out', 'gpt-5')).toBe(true);
  });
  it('ranks by use, then recency, then edits', () => {
    const ranked = rankVocabulary([entry('a', { hits: 1 }), entry('b', { hits: 3 }), entry('c', { hits: 1, lastUsedAt: 9 }), entry('d', { updatedAt: 5 })]);
    expect(ranked.map(item => item.term)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('gives recognition hints from the most used terms within a budget', () => {
    expect(asrHints([entry('Typeless', { hits: 1 }), entry('Claude', { hits: 5 })])).toEqual(['Claude', 'Typeless']);
    expect(asrHints(Array.from({ length: 30 }, (_, index) => entry(`w${index}`)))).toHaveLength(20);
    expect(asrHints(Array.from({ length: 10 }, (_, index) => entry(`${index}${'x'.repeat(63)}`)))).toHaveLength(4);
  });
  it('puts words the transcript may have misheard first and omits empty variant lists', () => {
    const entries = [entry('Typeless', { hits: 9 }), entry('Claude', { soundsLike: ['云'] }), entry('Anthropic', { hits: 4 })];
    expect(cleanupVocabulary(entries, '我用云写了脚本')).toEqual([{ term: 'Claude', soundsLike: ['云'] }, { term: 'Typeless' }, { term: 'Anthropic' }]);
    expect(cleanupVocabulary(Array.from({ length: 80 }, (_, index) => entry(`w${index}`)), 'w79')[0]).toEqual({ term: 'w79' });
    expect(cleanupVocabulary(Array.from({ length: 80 }, (_, index) => entry(`w${index}`)), '')).toHaveLength(50);
  });
  it('counts a term only when the final text contains it', () => {
    const entries = [entry('Claude', { id: 'c', soundsLike: ['云'] }), entry('Typeless', { id: 't' })];
    expect(usedEntryIds(entries, '我用 Claude 写了脚本，部署在阿里云。')).toEqual(['c']);
  });
});
