import { useEffect, useState, type ReactNode, type ChangeEvent, type KeyboardEvent } from 'react';
import { Field } from '../ui';
import { shortcutLabel } from '../shortcutPresentation';
import { writingLevel, writingLevels, type WritingLevel } from '../writingPresentation';
import { SaveStatus, useSettingDraft } from './Autosave';
import type { SettingsSectionProps } from './types';

const shortcutStatusMessages: Record<string, string> = {
  helper_unavailable: '助手正在重新连接', input_monitoring_denied: '请授权辅助功能或输入监控',
  tap_disabled: '监听不可用，正在恢复', tap_creation_failed: '监听不可用，正在恢复', runloop_source_failed: '监听不可用，正在恢复',
  binding_mismatch: '快捷键设置尚未生效', ready: '已就绪', disabled: '已关闭',
};

function Choice({ label, saved, save, children, hint }: { label: string; saved: string; save: (value: string) => Promise<boolean>; children: ReactNode; hint?: string }) {
  const draft = useSettingDraft(saved, save);
  return <div className="setting-row"><Field label={label} hint={hint}><select value={draft.value} disabled={draft.status === 'saving'} onChange={event => { draft.edit(event.target.value); void draft.commit(event.target.value); }}>{children}</select></Field><SaveStatus status={draft.status} retry={() => { void draft.commit(); }} /></div>;
}
function Switch({ label, saved, save }: { label: string; saved: boolean; save: (value: boolean) => Promise<boolean> }) {
  const draft = useSettingDraft(saved, save);
  return <div className="setting-row"><label className="toggle-row"><span>{label}</span><input type="checkbox" role="switch" checked={draft.value} disabled={draft.status === 'saving'} onChange={event => { draft.edit(event.target.checked); void draft.commit(event.target.checked); }} /></label><SaveStatus status={draft.status} retry={() => { void draft.commit(); }} /></div>;
}
function TextSetting({ label, saved, save, multiline = false, hint }: { label: string; saved: string; save: (value: string) => Promise<boolean>; multiline?: boolean; hint?: string }) {
  const draft = useSettingDraft(saved, save);
  const props = { value: draft.value, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => draft.edit(event.target.value), onBlur: () => { void draft.commit(); }, onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) { event.preventDefault(); void draft.commit(); }
  } };
  return <div className="setting-row"><Field label={label} hint={hint}>{multiline ? <textarea {...props} rows={5} placeholder="例如：保留英文技术术语，使用简体中文。" /> : <input {...props} />}</Field><SaveStatus status={draft.status} retry={() => { void draft.commit(); }} /></div>;
}


function ShortcutSetting({ saved, save, mac, available }: { saved: string; save: (value: string) => Promise<boolean>; mac: boolean; available: boolean }) {
  const presets = ['CommandOrControl+Shift+Space', 'CommandOrControl+Shift+D', 'CommandOrControl+Alt+Space'];
  const choices = presets.includes(saved) ? presets : [saved, ...presets];
  return <Choice label="备用快捷键" saved={saved} save={save} hint={available ? '已就绪' : '未注册，请选择其他组合键'}>{choices.map(binding => <option key={binding} value={binding}>{shortcutLabel(binding, mac)}</option>)}</Choice>;
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
  const primary = platform === 'win32' ? 'RightAlt' : 'Fn';
  const disabled = settings.shortcut.primary.toLowerCase() === 'disabled';
  const shortcutStatus = disabled ? '已关闭' : permissions.primaryShortcutAvailable ? '已就绪' : shortcutStatusMessages[permissions.shortcutMessage] || '暂不可用';
  return <>
    <section className="settings-group">
      <Choice label="麦克风" saved={settings.audio.deviceId} save={deviceId => run({ type: 'settings.save', patch: { audio: { deviceId } } })}><option value="default">系统默认</option>{devices.filter(device => device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `麦克风 ${index + 1}`}</option>)}</Choice>
      <Choice label="主要快捷键" saved={disabled ? 'Disabled' : primary} hint={shortcutStatus} save={primary => run({ type: 'settings.save', patch: { shortcut: { primary } } })}><option value={primary}>{primary === 'Fn' ? 'Fn' : 'Right Alt'} · 按一下开始 / 结束</option><option value="Disabled">关闭</option></Choice>
      <ShortcutSetting saved={settings.shortcut.fallback} mac={platform === 'darwin'} available={permissions.fallbackShortcutAvailable} save={fallback => run({ type: 'settings.save', patch: { shortcut: { fallback } } })} />
    </section>
    <section className="settings-group">
      <Switch label="完成后自动粘贴" saved={settings.general.autoInsert} save={autoInsert => run({ type: 'settings.save', patch: { general: { autoInsert } } })} />
      <Switch label="录音提示音" saved={settings.audio.interactionSounds} save={interactionSounds => run({ type: 'settings.save', patch: { audio: { interactionSounds } } })} />
      <Switch label="登录系统时启动" saved={settings.general.launchAtLogin} save={launchAtLogin => run({ type: 'settings.save', patch: { general: { launchAtLogin } } })} />
    </section>
    <section className="settings-group permissions-compact" aria-label="系统权限">
      <div className="permission-row"><span>麦克风 · {permissions.microphone === 'granted' ? '已授权' : '待授权'}</span>{permissions.microphone !== 'granted' && <button className="text-button" onClick={() => { void run({ type: 'permissions.request', permission: 'microphone' }); }}>授权</button>}</div>
      <div className="permission-row"><span>{platform === 'darwin' ? `辅助功能 · ${permissions.accessibility ? '已授权' : '待授权'}` : `系统输入助手 · ${permissions.nativeAvailable ? '已就绪' : '不可用'}`}</span><button className="text-button" onClick={() => { void run({ type: 'permissions.request', permission: 'accessibility' }); }}>打开系统设置</button></div>
      {platform === 'darwin' && <div className="permission-row"><span>输入监控 · {permissions.inputMonitoring ? '已授权' : '未单独授权'}</span></div>}
    </section>
  </>;
}

export function WritingSettings({ snapshot, run }: SettingsSectionProps) {
  const draft = useSettingDraft<WritingLevel>(writingLevel(snapshot.settings), level => run({ type: 'settings.save', patch: { cleanup: { enabled: level !== 'none' }, writing: { strength: level === 'light' ? 'light' : 'balanced' } } }));
  return <>
    <section className="settings-group"><h2>润色程度</h2><div className="segmented" role="group" aria-label="润色程度">{writingLevels.map(level => <button key={level.value} aria-pressed={draft.value === level.value} className={draft.value === level.value ? 'selected' : ''} disabled={draft.status === 'saving'} onClick={() => { draft.edit(level.value); void draft.commit(level.value); }}>{level.label}</button>)}</div><p className="muted">{writingLevels.find(level => level.value === draft.value)?.hint}</p><SaveStatus status={draft.status} retry={() => { void draft.commit(); }} /></section>
    <section className={`settings-group ${draft.value === 'none' ? 'writing-inactive' : ''}`}><TextSetting label="个人表达说明" multiline saved={snapshot.settings.writing.instructions} hint={draft.value === 'none' ? '开启润色后生效，说明会保留。' : '离开输入框自动保存，也可按 ⌘ / Ctrl + Enter。'} save={instructions => run({ type: 'settings.save', patch: { writing: { instructions } } })} /></section>
  </>;
}
