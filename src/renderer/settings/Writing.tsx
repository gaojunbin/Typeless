import type { ChangeEvent, KeyboardEvent } from 'react';
import { Segmented, SettingRow } from '../ui';
import { useI18n } from '../i18n';
import { writingLevel, writingLevels, type WritingLevel } from '../writingPresentation';
import { SaveStatus, useSettingDraft } from './Autosave';
import type { SettingsSectionProps } from './types';

/** Renders nothing while the draft is idle, so `.save-status` only exists during a save or after a failure. */
function saving(status: 'idle' | 'saving' | 'error', retry: () => void) {
  return status === 'idle' ? null : <SaveStatus status={status} retry={retry} />;
}

/** Polish level. Three UI levels map onto `cleanup.enabled` plus `writing.strength`; see docs/UI_DESIGN.md section 13.4. */
export function WritingLevelRow({ snapshot, run }: SettingsSectionProps) {
  const { t } = useI18n();
  const level = useSettingDraft<WritingLevel>(writingLevel(snapshot.settings), value => run({
    type: 'settings.save',
    patch: { cleanup: { enabled: value !== 'none' }, writing: { strength: value === 'light' ? 'light' : 'balanced' } },
  }));
  const label = t('settings.writing.level.label');
  const hintKey = writingLevels.find(item => item.value === level.value)?.hintKey;
  return <SettingRow stacked className="writing-level" label={label} control={<>
    <Segmented ariaLabel={label} options={writingLevels.map(item => ({ value: item.value, label: t(item.labelKey) }))} value={level.value} disabled={level.status === 'saving'} onChange={value => { level.edit(value); void level.commit(value); }} />
    <p className="writing-hint">{hintKey && t(hintKey)}</p>
  </>} status={saving(level.status, () => { void level.commit(); })} />;
}

/** Personal instructions sent with every polish request. Stays editable while polishing is off, and says so. */
export function WritingInstructionsRow({ snapshot, run }: SettingsSectionProps) {
  const { t } = useI18n();
  const instructions = useSettingDraft(snapshot.settings.writing.instructions, value => run({ type: 'settings.save', patch: { writing: { instructions: value } } }));
  const inactive = writingLevel(snapshot.settings) === 'none';
  const commit = () => { void instructions.commit(); };
  // Plain Enter keeps its native meaning inside a textarea, so it never submits the surrounding provider form.
  const shortcutCommit = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); commit(); }
  };
  return <SettingRow stacked className={`writing-instructions ${inactive ? 'writing-inactive' : ''}`.trim()} label={t('settings.writing.instructions.label')} htmlFor="writing-instructions"
    control={<textarea id="writing-instructions" value={instructions.value} placeholder={t('settings.writing.instructions.placeholder')}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => instructions.edit(event.target.value)}
      onBlur={commit}
      onKeyDown={shortcutCommit} />}
    status={<div className="writing-status">
      <p className="writing-hint">{t(inactive ? 'settings.writing.instructions.inactive' : 'settings.writing.instructions.hint')}</p>
      {saving(instructions.status, commit)}
    </div>} />;
}
