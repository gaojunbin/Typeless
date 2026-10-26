import type { VocabularyEntry } from '../../shared/contracts';
import { useI18n } from '../i18n';

/** Id of an entry's 编辑 button, so focus can return to it after editing or move to it after a deletion. */
export const editButtonId = (id: string) => `vocabulary-edit-${id}`;

/** One entry at rest: the term, its misrecognitions, how often it was used, then 编辑 and 删除. */
export function EntryRow({ entry, onEdit, onDelete }: { entry: VocabularyEntry; onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  const variants = entry.soundsLike.join(t('vocabulary.entry.separator'));
  return <li className="vocabulary-entry">
    <div className="vocabulary-entry-text">
      <span className="vocabulary-term">{entry.term}</span>
      {variants && <span className="vocabulary-variants">{t('vocabulary.entry.soundsLike', { variants })}</span>}
    </div>
    <div className="vocabulary-entry-meta">
      <span className="vocabulary-usage">{entry.hits > 0 ? t('vocabulary.entry.used', { count: entry.hits }) : t('vocabulary.entry.unused')}</span>
      <button type="button" id={editButtonId(entry.id)} className="text-button" onClick={onEdit}>{t('vocabulary.entry.edit')}</button>
      <button type="button" className="text-button danger-text" onClick={onDelete}>{t('vocabulary.entry.delete')}</button>
    </div>
  </li>;
}
