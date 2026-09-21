import { useEffect, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Keyboard, Laptop, Mic, PenLine, ShieldCheck, Sparkles } from 'lucide-react';
import { KeyChips, PageHeader, SectionGroup, Segmented, SettingRow, StatusBadge } from '../ui';
import { shortcutLabel } from '../shortcutPresentation';
import { writingLevel, writingLevels, type WritingLevel } from '../writingPresentation';
import { SaveStatus, useSettingDraft } from './Autosave';
import type { SettingsSectionProps } from './types';
import { inputMonitoringStatus, primaryShortcutStatus } from '../onboarding/permissionStatus';
import '../styles/preferences.css';

const fallbackPresets = ['CommandOrControl+Shift+Space', 'CommandOrControl+Shift+D', 'CommandOrControl+Alt+Space'];
const groupIcon = { size: 20, strokeWidth: 1.5 } as const;

/** Renders nothing while the draft is idle, so `.save-status` only exists during a save or after a failure. */
function saving(status: 'idle' | 'saving' | 'error', retry: () => void) {
  return status === 'idle' ? null : <SaveStatus status={status} retry={retry} />;
}

function SelectRow({ id, label, description, saved, save, status, children }: {
  id: string; label: string; description?: ReactNode; saved: string; save: (value: string) => Promise<boolean>; status?: ReactNode; children: ReactNode;
}) {
  const draft = useSettingDraft(saved, save);
  const progress = saving(draft.status, () => { void draft.commit(); });
  return <SettingRow label={label} description={description} htmlFor={id}
    control={<select id={id} value={draft.value} disabled={draft.status === 'saving'} onChange={event => { draft.edit(event.target.value); void draft.commit(event.target.value); }}>{children}</select>}
    status={status || progress ? <div className="pref-status">{status}{progress}</div> : undefined} />;
}

function SwitchRow({ label, description, saved, save }: { label: string; description?: ReactNode; saved: boolean; save: (value: boolean) => Promise<boolean> }) {
  const draft = useSettingDraft(saved, save);
  return <SettingRow inline className="pref-switch-row" label={label} description={description}
    control={<input type="checkbox" role="switch" aria-label={label} checked={draft.value} disabled={draft.status === 'saving'} onChange={event => { draft.edit(event.target.checked); void draft.commit(event.target.checked); }} />}
    status={saving(draft.status, () => { void draft.commit(); })} />;
}

function PermissionRow({ label, granted, text, action }: { label: string; granted: boolean; text: string; action?: { label: string; onClick: () => void } }) {
  return <SettingRow inline className="pref-permission-row" label={label} control={<>
    <StatusBadge tone={granted ? 'ok' : 'warn'}>{text}</StatusBadge>
    {action && <button type="button" className="secondary small" onClick={action.onClick}>{action.label}</button>}
  </>} />;
}

export function BasicSettings({ snapshot, run }: SettingsSectionProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    let live = true;
    const load = async () => { try { const list = await navigator.mediaDevices.enumerateDevices(); if (live) setDevices(list.filter(device => device.kind === 'audioinput')); } catch { /* The system default remains available. */ } };
    void load(); navigator.mediaDevices.addEventListener('devicechange', load);
    return () => { live = false; navigator.mediaDevices.removeEventListener('devicechange', load); };
  }, [snapshot.permissions.microphone]);
  const { settings, permissions, platform } = snapshot;
  const mac = platform === 'darwin';
  const primary = platform === 'win32' ? 'RightAlt' : 'Fn';
  const off = settings.shortcut.primary.toLowerCase() === 'disabled';
  const shortcutState = primaryShortcutStatus(snapshot);
  const inputMonitoring = inputMonitoringStatus(snapshot);
  const fallbackChoices = fallbackPresets.includes(settings.shortcut.fallback) ? fallbackPresets : [settings.shortcut.fallback, ...fallbackPresets];
  const openAccessibility = () => { void run({ type: 'permissions.request', permission: 'accessibility' }); };
  const openPane = (pane: 'microphone' | 'inputMonitoring') => () => { void run({ type: 'permissions.open', pane }); };
  return <>
    <PageHeader title="基本设置" subtitle="快捷键、麦克风、粘贴行为与系统权限。" />
    <SectionGroup icon={<Keyboard {...groupIcon} />} title="快捷键">
      <SelectRow id="pref-shortcut-primary" label="主要快捷键" description="按一下开始，再按一下结束。"
        saved={off ? 'Disabled' : primary} save={value => run({ type: 'settings.save', patch: { shortcut: { primary: value } } })}
        status={<div className="pref-shortcut-status">
          <StatusBadge tone={shortcutState.tone}>{shortcutState.text}</StatusBadge>
          {permissions.shortcutMessage === 'relaunch_required' && <button type="button" className="secondary small" onClick={() => { void run({ type: 'app.relaunch' }); }}>重新打开 Typeless</button>}
          {!off && <KeyChips binding={settings.shortcut.primary} mac={mac} />}
        </div>}>
        <option value={primary}>{primary === 'Fn' ? 'Fn' : 'Right Alt'} · 按一下开始 / 结束</option>
        <option value="Disabled">关闭</option>
      </SelectRow>
      <SelectRow id="pref-shortcut-fallback" label="备用快捷键"
        saved={settings.shortcut.fallback} save={value => run({ type: 'settings.save', patch: { shortcut: { fallback: value } } })}
        status={<StatusBadge tone={permissions.fallbackShortcutAvailable ? 'ok' : 'warn'}>{permissions.fallbackShortcutAvailable ? '已就绪' : '未注册，请选择其他组合键'}</StatusBadge>}>
        {fallbackChoices.map(binding => <option key={binding} value={binding}>{shortcutLabel(binding, mac)}</option>)}
      </SelectRow>
    </SectionGroup>
    <SectionGroup icon={<Mic {...groupIcon} />} title="音频">
      <SelectRow id="pref-microphone" label="麦克风" saved={settings.audio.deviceId} save={deviceId => run({ type: 'settings.save', patch: { audio: { deviceId } } })}>
        <option value="default">系统默认</option>
        {devices.filter(device => device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `麦克风 ${index + 1}`}</option>)}
      </SelectRow>
      <SwitchRow label="录音提示音" saved={settings.audio.interactionSounds} save={interactionSounds => run({ type: 'settings.save', patch: { audio: { interactionSounds } } })} />
    </SectionGroup>
    <SectionGroup icon={<Laptop {...groupIcon} />} title="通用">
      <SwitchRow label="完成后自动粘贴" description="把结果粘贴到当前前台应用，不会按下回车。" saved={settings.general.autoInsert} save={autoInsert => run({ type: 'settings.save', patch: { general: { autoInsert } } })} />
      <SwitchRow label="登录系统时启动" saved={settings.general.launchAtLogin} save={launchAtLogin => run({ type: 'settings.save', patch: { general: { launchAtLogin } } })} />
    </SectionGroup>
    <SectionGroup icon={<ShieldCheck {...groupIcon} />} title="系统权限">
      <PermissionRow label="麦克风" granted={permissions.microphone === 'granted'} text={permissions.microphone === 'granted' ? '已授权' : '待授权'}
        action={permissions.microphone === 'granted' ? undefined
          : permissions.microphone === 'denied' ? { label: '打开系统设置', onClick: openPane('microphone') }
          : { label: '授权', onClick: () => { void run({ type: 'permissions.request', permission: 'microphone' }); } }} />
      {mac
        ? <PermissionRow label="辅助功能" granted={permissions.accessibility} text={permissions.accessibility ? '已授权' : '待授权'} action={{ label: '打开系统设置', onClick: openAccessibility }} />
        : <PermissionRow label="系统输入助手" granted={permissions.nativeAvailable} text={permissions.nativeAvailable ? '已就绪' : '不可用'} action={{ label: '打开系统设置', onClick: openAccessibility }} />}
      {mac && <PermissionRow label="输入监控" granted={inputMonitoring.ok} text={inputMonitoring.text}
        action={inputMonitoring.ok ? undefined : { label: '打开系统设置', onClick: openPane('inputMonitoring') }} />}
      <SettingRow inline className="pref-permission-row" label="设置向导" description="重新检查权限、麦克风与快捷键。"
        control={<button type="button" className="secondary small" onClick={() => { void run({ type: 'settings.save', patch: { general: { setupCompleted: false } } }); }}>重新运行设置向导</button>} />
    </SectionGroup>
  </>;
}

export function WritingSettings({ snapshot, run }: SettingsSectionProps) {
  const level = useSettingDraft<WritingLevel>(writingLevel(snapshot.settings), value => run({ type: 'settings.save', patch: { cleanup: { enabled: value !== 'none' }, writing: { strength: value === 'light' ? 'light' : 'balanced' } } }));
  const instructions = useSettingDraft(snapshot.settings.writing.instructions, value => run({ type: 'settings.save', patch: { writing: { instructions: value } } }));
  const inactive = level.value === 'none';
  const commitInstructions = () => { void instructions.commit(); };
  return <>
    <PageHeader title="表达风格" subtitle="决定识别结果如何整理。个人表达说明会随每次润色一起发送。" />
    <SectionGroup icon={<Sparkles {...groupIcon} />} title="润色程度">
      <SettingRow stacked className="pref-untitled writing-level" label="润色程度" control={<>
        <Segmented ariaLabel="润色程度" options={writingLevels} value={level.value} disabled={level.status === 'saving'} onChange={value => { level.edit(value); void level.commit(value); }} />
        <p className="pref-hint">{writingLevels.find(item => item.value === level.value)?.hint}</p>
      </>} status={saving(level.status, () => { void level.commit(); })} />
    </SectionGroup>
    <SectionGroup className={inactive ? 'writing-inactive' : ''} icon={<PenLine {...groupIcon} />} title="个人表达说明">
      <SettingRow stacked className="pref-untitled writing-instructions" label="个人表达说明" htmlFor="writing-instructions"
        control={<textarea id="writing-instructions" value={instructions.value} placeholder="例如：保留英文技术术语，使用简体中文。"
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => instructions.edit(event.target.value)}
          onBlur={commitInstructions}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); commitInstructions(); } }} />}
        status={<div className="pref-status">
          <p className="pref-hint">{inactive ? '开启润色后生效，说明会保留。' : '离开输入框自动保存，也可按 ⌘ / Ctrl + Enter。'}</p>
          {saving(instructions.status, commitInstructions)}
        </div>} />
    </SectionGroup>
  </>;
}
