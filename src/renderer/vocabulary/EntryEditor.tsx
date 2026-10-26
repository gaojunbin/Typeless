import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { vocabularyLimits, type VocabularyEntry } from '../../shared/contracts';
import { Field } from '../ui';
import { useI18n } from '../i18n';
import type { RunAction } from '../settings/types';
import { pasteVariants, splitVariants } from './variants';

/** One entry in edit mode. Enter saves, Escape cancels; a failed save keeps the edits open and says so. */
export function EntryEditor({ entry, run, onClose }: { entry: VocabularyEntry; run: RunAction; onClose: () => void }) {
  const { t } = useI18n();
  const separator = t('vocabulary.entry.separator');
  const [term, setTerm] = useState(entry.term);
  const [variants, setVariants] = useState(() => entry.soundsLike.join(separator));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const word = term.trim();
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!word || busy) return;
    const soundsLike = splitVariants(variants);
    // Saving an unchanged entry would only bump its edit time and move it in the list.
    if (word === entry.term && JSON.stringify(soundsLike) === JSON.stringify(entry.soundsLike)) { onClose(); return; }
    setBusy(true); setFailed(false);
    const ok = await run({ type: 'vocabulary.save', entry: { id: entry.id, term: word, soundsLike } });
    setBusy(false);
    if (ok) onClose(); else setFailed(true);
  }
  // Escape that ends an IME composition belongs to the input method, not to the form.
  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onClose();
  }
  const change = (update: (value: string) => void) => (value: string) => { update(value); setFailed(false); };
  const changeTerm = change(setTerm);
  const changeVariants = change(setVariants);
  return <li className="vocabulary-entry editing">
    <form className="vocabulary-editor" onSubmit={event => { void save(event); }} onKeyDown={escape}>
      <div className="vocabulary-editor-fields">
        <Field label={t('vocabulary.field.term')}><input autoFocus value={term} maxLength={vocabularyLimits.length} spellCheck={false} onChange={event => changeTerm(event.target.value)} /></Field>
        <Field label={t('vocabulary.field.soundsLike')}><input value={variants} spellCheck={false} onChange={event => changeVariants(event.target.value)} onPaste={pasteVariants(changeVariants, separator)} /></Field>
      </div>
      <div className="vocabulary-editor-actions">
        <button type="button" className="text-button" onClick={onClose}>{t('vocabulary.entry.cancel')}</button>
        <button type="submit" className="primary small" disabled={!word}>{t('vocabulary.entry.save')}</button>
      </div>
      {failed && <p className="error-text" role="alert">{t('vocabulary.saveFailed')}</p>}
    </form>
  </li>;
}
