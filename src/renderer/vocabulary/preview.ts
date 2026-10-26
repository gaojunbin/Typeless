import type { VocabularyEntry } from '../../shared/contracts';

const sameTerm = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
const mostUsedFirst = (a: VocabularyEntry, b: VocabularyEntry) => b.hits - a.hits || b.lastUsedAt - a.lastUsedAt || b.updatedAt - a.updatedAt;

/** Trimmed, unique variants that differ from the term. */
function variantsOf(term: string, soundsLike: string[]) {
  return [...new Set(soundsLike.map(variant => variant.trim()).filter(variant => variant && variant !== term))];
}

/**
 * `vocabulary.save` for the browser preview, a simplified copy of main's rules: without an id it adds
 * the term or merges the variants into the entry with the same term; with an id it replaces that
 * entry unless another entry already has the new term. Mutates `list` and keeps it most used first.
 */
export function savePreviewEntry(list: VocabularyEntry[], entry: { id?: string; term: string; soundsLike: string[] }): boolean {
  const term = entry.term.trim();
  const now = Date.now();
  if (!term) return false;
  if (entry.id) {
    const target = list.find(item => item.id === entry.id);
    if (!target || list.some(item => item.id !== entry.id && sameTerm(item.term, term))) return false;
    Object.assign(target, { term, soundsLike: variantsOf(term, entry.soundsLike), updatedAt: now });
  } else {
    const existing = list.find(item => sameTerm(item.term, term));
    if (existing) Object.assign(existing, { soundsLike: variantsOf(existing.term, [...existing.soundsLike, ...entry.soundsLike]), updatedAt: now });
    else list.push({ id: crypto.randomUUID(), term, soundsLike: variantsOf(term, entry.soundsLike), hits: 0, lastUsedAt: 0, createdAt: now, updatedAt: now });
  }
  list.sort(mostUsedFirst);
  return true;
}
