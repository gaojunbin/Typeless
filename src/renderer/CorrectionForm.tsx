import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { vocabularyLimits } from '../shared/contracts';
import type { RunAction } from './settings/types';
import { Field } from './ui';
import { useI18n } from './i18n';

/** What the correction form opens with: the selected misrecognition and, when it came from the result text, its offset there. */
export interface CorrectionDraft { heard: string; start?: number; serial: number }

/**
 * Reads the selection inside the result paragraph. Only the part overlapping its text node counts; it is
 * trimmed and the offset moved past the leading whitespace, so main finds exactly `heard` at `start`.
 * A selection across a line break is ignored: main keeps one-line variants, and the input would drop the break.
 */
function selectionIn(paragraph: HTMLElement | null): { heard: string; start?: number } {
  const node = paragraph?.firstChild;
  const selection = window.getSelection();
  if (!(node instanceof Text) || !selection || selection.rangeCount === 0 || selection.isCollapsed) return { heard: '' };
  const range = selection.getRangeAt(0);
  if (!range.intersectsNode(node)) return { heard: '' };
  const from = range.startContainer === node ? range.startOffset : 0;
  const to = range.endContainer === node ? range.endOffset : node.length;
  const picked = node.data.slice(from, to);
  const heard = picked.trim();
  return heard && !/\p{Cc}/u.test(heard) ? { heard, start: from + picked.length - picked.trimStart().length } : { heard: '' };
}

/** Correction state of the shown result. `scope` is empty while the result cannot be corrected; any change closes the form. */
export function useCorrection(scope: string) {
  const [draft, setDraft] = useState<CorrectionDraft | null>(null);
  const [added, setAdded] = useState(false);
  const serial = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setDraft(null); setAdded(false); clearTimeout(timer.current);
    return () => clearTimeout(timer.current);
  }, [scope]);
  return {
    draft,
    /** True for about two seconds after a correction was learned. */
    added,
    /** Opens the form afresh, prefilled from the selection in `paragraph` when there is one. */
    open(paragraph: HTMLElement | null) {
      clearTimeout(timer.current); setAdded(false);
      setDraft({ ...selectionIn(paragraph), serial: ++serial.current });
    },
    close(learned: boolean) {
      setDraft(null);
      if (!learned) return;
      setAdded(true);
      timer.current = setTimeout(() => setAdded(false), 2000);
    },
  };
}

/** 识别成 → 应为: learns the pair in the vocabulary and, while 识别成 is still the selected text, fixes that spot in the result. */
export function CorrectionForm({ draft, run, onClose }: { draft: CorrectionDraft; run: RunAction; onClose: (learned: boolean) => void }) {
  const { t } = useI18n();
  const [heard, setHeard] = useState(draft.heard);
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrong = heard.trim();
  const right = term.trim();
  const ready = Boolean(wrong && right && wrong !== right);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setFailed(false);
    const start = wrong === draft.heard ? draft.start : undefined;
    const ok = await run({ type: 'dictation.correct', heard: wrong, term: right, ...(start === undefined ? {} : { start }) });
    setBusy(false);
    if (ok) onClose(true); else setFailed(true);
  }
  // Escape that ends an IME composition belongs to the input method, not to the form.
  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onClose(false);
  }
  const edit = (update: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => { update(event.target.value); setFailed(false); };
  return <form className="correction-form" onSubmit={event => { void submit(event); }} onKeyDown={escape}>
    <div className="correction-fields">
      <Field label={t('home.correction.heard')}><input value={heard} autoFocus={!draft.heard} spellCheck={false} onChange={edit(setHeard)} /></Field>
      <Field label={t('home.correction.term')}><input value={term} autoFocus={Boolean(draft.heard)} maxLength={vocabularyLimits.length} spellCheck={false} onChange={edit(setTerm)} /></Field>
      <div className="correction-actions">
        <button type="button" className="text-button" onClick={() => onClose(false)}>{t('home.correction.cancel')}</button>
        <button type="submit" className="primary small" disabled={!ready}>{t('home.correction.submit')}</button>
      </div>
    </div>
    {failed && <p className="error-text" role="alert">{t('home.correction.failed')}</p>}
  </form>;
}
