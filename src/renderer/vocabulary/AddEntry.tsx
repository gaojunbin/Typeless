import { useRef, useState, type FormEvent } from 'react';
import { BookPlus } from 'lucide-react';
import { vocabularyLimits } from '../../shared/contracts';
import { SectionGroup, SettingRow } from '../ui';
import { useI18n } from '../i18n';
import type { RunAction } from '../settings/types';
import { pasteVariants, splitVariants } from './variants';

/** Id of the 常用词 input; the list also moves focus here after its last entry is deleted. */
export const termInputId = 'vocabulary-term';

/** 添加常用词. Adding a word that already exists merges its variants in main, so it is never an error. */
export function AddEntry({ run }: { run: RunAction }) {
  const { t } = useI18n();
  const [term, setTerm] = useState('');
  const [variants, setVariants] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const termInput = useRef<HTMLInputElement>(null);
  const word = term.trim();
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!word || busy) return;
    setBusy(true); setFailed(false);
    const ok = await run({ type: 'vocabulary.save', entry: { term: word, soundsLike: splitVariants(variants) } });
    setBusy(false);
    if (ok) { setTerm(''); setVariants(''); } else setFailed(true);
    termInput.current?.focus();
  }
  const change = (update: (value: string) => void) => (value: string) => { update(value); setFailed(false); };
  const changeTerm = change(setTerm);
  const changeVariants = change(setVariants);
  return <SectionGroup icon={<BookPlus size={20} strokeWidth={1.5} />} title={t('vocabulary.add.title')}>
    <form className="vocabulary-add" onSubmit={event => { void add(event); }}>
      <SettingRow label={t('vocabulary.field.term')} htmlFor={termInputId}
        control={<input id={termInputId} ref={termInput} value={term} maxLength={vocabularyLimits.length} readOnly={busy} spellCheck={false}
          placeholder={t('vocabulary.field.term.placeholder')} onChange={event => changeTerm(event.target.value)} />} />
      <SettingRow label={t('vocabulary.field.soundsLike')} htmlFor="vocabulary-sounds-like" description={t('vocabulary.field.soundsLike.hint')}
        control={<input id="vocabulary-sounds-like" value={variants} readOnly={busy} spellCheck={false}
          placeholder={t('vocabulary.field.soundsLike.placeholder')} onChange={event => changeVariants(event.target.value)}
          onPaste={pasteVariants(changeVariants, t('vocabulary.entry.separator'))} />} />
      <div className="vocabulary-actions"><button type="submit" className="primary" disabled={!word || busy}>{t('vocabulary.add')}</button></div>
      {failed && <p className="error-text" role="alert">{t('vocabulary.saveFailed')}</p>}
    </form>
  </SectionGroup>;
}
