import type { ChangeEvent, KeyboardEvent } from 'react';
import { Segmented, SettingRow } from '../ui';
import { writingLevel, writingLevels, type WritingLevel } from '../writingPresentation';
import { SaveStatus, useSettingDraft } from './Autosave';
import type { SettingsSectionProps } from './types';

/** Renders nothing while the draft is idle, so `.save-status` only exists during a save or after a failure. */
function saving(status: 'idle' | 'saving' | 'error', retry: () => void) {
  return status === 'idle' ? null : <SaveStatus status={status} retry={retry} />;
}

/** Polish level. Three UI levels map onto `cleanup.enabled` plus `writing.strength`; see docs/UI_DESIGN.md section 13.4. */
export function WritingLevelRow({ snapshot, run }: SettingsSectionProps) {
  const level = useSettingDraft<WritingLevel>(writingLevel(snapshot.settings), value => run({
    type: 'settings.save',
    patch: { cleanup: { enabled: value !== 'none' }, writing: { strength: value === 'light' ? 'light' : 'balanced' } },
  }));
  return <SettingRow stacked className="writing-level" label="润色程度" control={<>
    <Segmented ariaLabel="润色程度" options={writingLevels} value={level.value} disabled={level.status === 'saving'} onChange={value => { level.edit(value); void level.commit(value); }} />
    <p className="writing-hint">{writingLevels.find(item => item.value === level.value)?.hint}</p>
  </>} status={saving(level.status, () => { void level.commit(); })} />;
}

/** Personal instructions sent with every polish request. Stays editable while the level is 不润色, and says so. */
export function WritingInstructionsRow({ snapshot, run }: SettingsSectionProps) {
  const instructions = useSettingDraft(snapshot.settings.writing.instructions, value => run({ type: 'settings.save', patch: { writing: { instructions: value } } }));
  const inactive = writingLevel(snapshot.settings) === 'none';
  const commit = () => { void instructions.commit(); };
  // Plain Enter keeps its native meaning inside a textarea, so it never submits the surrounding provider form.
  const shortcutCommit = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); commit(); }
  };
  return <SettingRow stacked className={`writing-instructions ${inactive ? 'writing-inactive' : ''}`.trim()} label="个人表达说明" htmlFor="writing-instructions"
    control={<textarea id="writing-instructions" value={instructions.value} placeholder="例如：保留英文技术术语，使用简体中文。"
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => instructions.edit(event.target.value)}
      onBlur={commit}
      onKeyDown={shortcutCommit} />}
    status={<div className="writing-status">
      <p className="writing-hint">{inactive ? '开启润色后生效，说明会保留。' : '离开输入框自动保存，也可按 ⌘ / Ctrl + Enter。'}</p>
      {saving(instructions.status, commit)}
    </div>} />;
}
