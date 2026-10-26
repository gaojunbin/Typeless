import { vocabularyLimits, type VocabularyEntry } from '../shared/contracts';

/** What the polishing model receives for one word; see cleanup-prompt.ts. */
export interface VocabularyHint { term: string; soundsLike?: string[] }

const asrHintCount = 20;
const asrHintCharacters = 300;
const cleanupHintCount = 50;

const fold = (value: string) => value.normalize('NFKC').toLowerCase();
export const sameWord = (a: string, b: string) => fold(a) === fold(b);

function word(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || text.length > vocabularyLimits.length || /\p{Cc}/u.test(text)) throw new Error(`${label} must be 1–${vocabularyLimits.length} characters on one line.`);
  return text;
}

/** Trims and de-duplicates variants, dropping blanks and any that only repeat the term. */
export function variants(values: unknown, term: string): string[] {
  if (!Array.isArray(values) || values.length > vocabularyLimits.soundsLike * 4) throw new Error('Variants must be a short list of text.');
  const kept: string[] = [];
  for (const value of values) {
    if (typeof value === 'string' && !value.trim()) continue;
    const text = word(value, 'A variant');
    if (!sameWord(text, term) && !kept.some(other => sameWord(other, text))) kept.push(text);
  }
  if (kept.length > vocabularyLimits.soundsLike) throw new Error(`A word can have at most ${vocabularyLimits.soundsLike} variants.`);
  return kept;
}

export function vocabularyInput(input: unknown): { id?: string; term: string; soundsLike: string[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid vocabulary entry.');
  const { id, term, soundsLike } = input as Record<string, unknown>;
  if (id !== undefined && (typeof id !== 'string' || !id || id.length > 100)) throw new Error('Invalid vocabulary entry.');
  const text = word(term, 'The word');
  return { ...(id ? { id } : {}), term: text, soundsLike: variants(soundsLike, text) };
}

/** Merged variants keep the newest ones when the list would exceed its limit. */
export function mergeVariants(current: string[], added: string[], term: string): string[] {
  const merged = [...current.filter(value => !added.some(other => sameWord(other, value))), ...added].filter(value => !sameWord(value, term));
  return merged.slice(-vocabularyLimits.soundsLike);
}

const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Strict like the settings projection: a damaged saved vocabulary is reported, never silently dropped. */
export function parseVocabulary(value: unknown): VocabularyEntry[] {
  if (!Array.isArray(value) || value.length > vocabularyLimits.entries) throw new Error('Invalid saved vocabulary.');
  return value.map(item => {
    const entry = item as Record<string, unknown>;
    let parsed;
    try { parsed = vocabularyInput(entry); } catch { throw new Error('Invalid saved vocabulary.'); }
    const { id, term, soundsLike } = parsed;
    if (!id || !Number.isInteger(entry.hits) || !count(entry.hits) || !count(entry.lastUsedAt) || !count(entry.createdAt) || !count(entry.updatedAt)) throw new Error('Invalid saved vocabulary.');
    return { id, term, soundsLike, hits: entry.hits as number, lastUsedAt: entry.lastUsedAt as number, createdAt: entry.createdAt as number, updatedAt: entry.updatedAt as number };
  });
}

export function rankVocabulary(entries: VocabularyEntry[]): VocabularyEntry[] {
  return [...entries].sort((a, b) => b.hits - a.hits || b.lastUsedAt - a.lastUsedAt || b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
}

const latin = /[\p{Script=Latin}\p{Nd}]/u;
/** Case-insensitive; a word that starts or ends with a Latin letter or digit must not be part of a longer Latin word. */
export function mentions(text: string, value: string): boolean {
  const haystack = fold(text); const needle = fold(value);
  if (!needle) return false;
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) {
    const before = latin.test(needle[0]) && at > 0 && latin.test(haystack[at - 1]);
    const after = latin.test(needle[needle.length - 1]) && at + needle.length < haystack.length && latin.test(haystack[at + needle.length]);
    if (!before && !after) return true;
  }
  return false;
}

/** Recognition hints for OpenAI-compatible speech services: the most used terms within a small prompt budget. */
export function asrHints(entries: VocabularyEntry[]): string[] {
  const hints: string[] = [];
  let length = 0;
  for (const entry of rankVocabulary(entries)) {
    if (hints.length >= asrHintCount || length + entry.term.length > asrHintCharacters) break;
    hints.push(entry.term); length += entry.term.length + 2;
  }
  return hints;
}

/** Words the transcript may have misheard come first, then the most used ones, within a fixed count. */
export function cleanupVocabulary(entries: VocabularyEntry[], transcript: string): VocabularyHint[] {
  const ranked = rankVocabulary(entries);
  const heard = ranked.filter(entry => mentions(transcript, entry.term) || entry.soundsLike.some(value => mentions(transcript, value)));
  return [...heard, ...ranked.filter(entry => !heard.includes(entry))].slice(0, cleanupHintCount)
    .map(({ term, soundsLike }) => soundsLike.length ? { term, soundsLike } : { term });
}

export function usedEntryIds(entries: VocabularyEntry[], text: string): string[] {
  return entries.filter(entry => mentions(text, entry.term)).map(entry => entry.id);
}
