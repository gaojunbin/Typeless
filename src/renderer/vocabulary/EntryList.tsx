import { useEffect, useRef, useState } from 'react';
import { BookA } from 'lucide-react';
import type { VocabularyEntry } from '../../shared/contracts';
import { SectionGroup } from '../ui';
import { useI18n } from '../i18n';
import type { RunAction } from '../settings/types';
import { termInputId } from './AddEntry';
import { EntryEditor } from './EntryEditor';
import { editButtonId, EntryRow } from './EntryRow';

/** Focus to restore after a render: an entry's 编辑 button, or, once a deleted entry has left the list, its neighbour's. */
type FocusTarget = { id: string; deletedAt?: number };

/** 常用词 · N in the order main sends (most used first). One row edits at a time; 删除 needs no confirmation. */
export function EntryList({ entries, run }: { entries: VocabularyEntry[]; run: RunAction }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const focusTarget = useRef<FocusTarget | null>(null);
  // Runs after every render: a deleted entry leaves only with the next snapshot, which may come after the action returns.
  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    if (target.deletedAt !== undefined && entries.some(entry => entry.id === target.id)) return;
    focusTarget.current = null;
    const id = target.deletedAt === undefined ? target.id : entries[Math.min(target.deletedAt, entries.length - 1)]?.id;
    document.getElementById(id ? editButtonId(id) : termInputId)?.focus();
  });
  function close(id: string) {
    focusTarget.current = { id };
    setEditing(null);
  }
  async function remove(id: string, index: number) {
    if (deleting) return;
    setDeleting(id);
    if (await run({ type: 'vocabulary.delete', id })) focusTarget.current = { id, deletedAt: index };
    setDeleting(null);
  }
  return <SectionGroup icon={<BookA size={20} strokeWidth={1.5} />} title={t('vocabulary.list.title', { count: entries.length })}>
    {entries.length === 0
      ? <p className="vocabulary-empty">{t('vocabulary.list.empty')}</p>
      : <ul className="vocabulary-list">
        {entries.map((entry, index) => entry.id === editing
          ? <EntryEditor key={entry.id} entry={entry} run={run} onClose={() => close(entry.id)} />
          : <EntryRow key={entry.id} entry={entry} onEdit={() => setEditing(entry.id)} onDelete={() => { void remove(entry.id, index); }} />)}
      </ul>}
  </SectionGroup>;
}
