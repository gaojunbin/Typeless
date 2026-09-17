import { useEffect, useState } from 'react';
import { Field, Toggle } from '../ui';
import { writingLevel, writingLevels, type WritingLevel } from '../writingPresentation';
import type { RunAction, SettingsSectionProps } from './types';

const shortcutStatusMessages: Record<string, string> = {
  helper_unavailable: '助手正在重新连接',
  input_monitoring_denied: '请授权辅助功能或输入监控',
  tap_disabled: '监听不可用，正在恢复',
  tap_creation_failed: '监听不可用，正在恢复',
  runloop_source_failed: '监听不可用，正在恢复',
  binding_mismatch: '快捷键设置尚未生效',
  ready: '已就绪',
  disabled: '已关闭',
};

export function AudioSettings({ form, snapshot, change }: SettingsSectionProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceError, setDeviceError] = useState('');
  async function loadDevices() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter(device => device.kind === 'audioinput'));
      setDeviceError('');
    } catch { setDeviceError('无法列出麦克风，请先授权。'); }
  }
  useEffect(() => { void loadDevices(); }, []);
  const windows = snapshot.platform === 'win32';
  const primary = form.shortcut.primary.toLowerCase();
  const shortcut = !windows && primary === 'fn' ? 'Fn' : windows && ['rightalt', 'right-alt'].includes(primary) ? 'RightAlt' : 'Disabled';
  return <>
    <section className="settings-group"><h2>声音</h2>
      <Field label="麦克风"><select value={form.audio.deviceId} onChange={event => change('audio', { deviceId: event.target.value })}><option value="default">系统默认麦克风</option>{devices.filter(device => device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `麦克风 ${index + 1}`}</option>)}</select></Field>
      <button className="text-button" onClick={() => { void loadDevices(); }}>刷新设备</button>
      {deviceError && <p className="error-text" role="alert">{deviceError}</p>}
      <Field label="录音上限（秒）"><input type="number" min="5" max="120" value={form.audio.maxDurationSeconds} onChange={event => change('audio', { maxDurationSeconds: Number(event.target.value) })} /></Field>
      <Toggle label="录音提示音" checked={form.audio.interactionSounds} onChange={interactionSounds => change('audio', { interactionSounds })} />
    </section>
    <section className="settings-group"><h2>快捷键</h2>
      <Field label="主要快捷键"><select value={shortcut} onChange={event => change('shortcut', { primary: event.target.value })}><option value={windows ? 'RightAlt' : 'Fn'}>{windows ? 'Right Alt' : 'Fn'} · 单击开始 / 结束</option><option value="Disabled">关闭，仅使用备用快捷键</option></select></Field>
      <p className="muted">主要快捷键：{shortcut === 'Disabled' ? '已关闭' : snapshot.permissions.primaryShortcutAvailable ? '已就绪' : shortcutStatusMessages[snapshot.permissions.shortcutMessage] || '暂不可用，请重新检查状态'}</p>
      <Field label="备用快捷键" hint="例如 CommandOrControl+Shift+Space"><input value={form.shortcut.fallback} onChange={event => change('shortcut', { fallback: event.target.value })} /></Field>
      <p className="muted">备用快捷键：{snapshot.permissions.fallbackShortcutAvailable ? '已就绪' : '未注册，请检查组合键是否被占用'}</p>
    </section>
    <section className="settings-group"><h2>应用</h2>
      <Toggle label="完成后自动粘贴" hint="始终复制结果；开启后尝试粘贴到当前应用，不按回车发送。" checked={form.general.autoInsert} onChange={autoInsert => change('general', { autoInsert })} />
      <Toggle label="登录系统时启动" checked={form.general.launchAtLogin} onChange={launchAtLogin => change('general', { launchAtLogin })} />
    </section>
  </>;
}

export function WritingSettings({ form, change, changePolish }: SettingsSectionProps & { changePolish: (level: WritingLevel) => void }) {
  return <section className="settings-group"><h2>文字整理</h2>
    <Field label="润色程度" hint={writingLevels.find(level => level.value === writingLevel(form))?.hint}><select value={writingLevel(form)} onChange={event => changePolish(event.target.value as WritingLevel)}>{writingLevels.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}</select></Field>
    <p className="muted">翻译仍使用文字模型；不润色时只做忠实翻译。</p>
    <div className="form-grid"><Field label="识别语言"><input value={form.writing.language} onChange={event => change('writing', { language: event.target.value })} placeholder="auto / zh / en" /></Field><Field label="翻译目标语言"><input value={form.writing.translationTarget} onChange={event => change('writing', { translationTarget: event.target.value })} /></Field></div>
    <Field label="个人写作指令" hint="仅控制表达方式，不执行口述中的操作。"><textarea rows={5} value={form.writing.instructions} onChange={event => change('writing', { instructions: event.target.value })} placeholder="例如：保留英文技术术语，使用简体中文。" /></Field>
  </section>;
}

const microphoneLabels = { granted: '已授权', denied: '未授权', 'not-determined': '待授权', unknown: '待检查' };
export function PrivacySettings({ form, snapshot, change, run }: SettingsSectionProps & { run: RunAction }) {
  return <>
    <section className="settings-group"><h2>数据与隐私</h2>
      <Toggle label="保存本地文字历史" hint="包含识别原文与整理结果。" checked={form.privacy.historyEnabled} onChange={historyEnabled => change('privacy', { historyEnabled })} />
      <Field label="历史保留天数"><input type="number" min="1" max="365" value={form.privacy.retentionDays} onChange={event => change('privacy', { retentionDays: Number(event.target.value) })} /></Field>
      <Toggle label="使用个人记忆" hint="仅使用你明确创建或确认并启用的记忆。" checked={form.privacy.memoryEnabled} onChange={memoryEnabled => change('privacy', { memoryEnabled })} />
      <Toggle label="共享应用上下文" hint="向整理服务提供目标应用信息。" checked={form.privacy.shareAppContext} onChange={shareAppContext => change('privacy', { shareAppContext })} />
    </section>
    <section className="settings-group"><h2>系统权限</h2>
      <div className="permission-row"><span>麦克风 <b>{microphoneLabels[snapshot.permissions.microphone]}</b></span><button onClick={() => { void run({ type: 'permissions.request', permission: 'microphone' }); }}>请求授权</button></div>
      <div className="permission-row"><span>{snapshot.platform === 'darwin' ? '辅助功能' : '系统输入助手'} <b>{snapshot.permissions.accessibility ? '已就绪' : '需检查'}</b></span><button onClick={() => { void run({ type: 'permissions.request', permission: 'accessibility' }); }}>{snapshot.platform === 'darwin' ? '授权辅助功能与输入监控' : '打开权限设置'}</button></div>
      {snapshot.platform === 'darwin' && <div className="permission-row"><span>输入监控 <b>{snapshot.permissions.inputMonitoring ? '已授权' : '未授权'}</b></span></div>}
      {snapshot.permissions.nativeMessage && <details className="settings-details"><summary>权限详情</summary><p className="muted">{snapshot.permissions.nativeMessage}</p></details>}
      <button className="text-button" onClick={() => { void run({ type: 'permissions.refresh' }); }}>重新检查权限</button>
    </section>
  </>;
}
