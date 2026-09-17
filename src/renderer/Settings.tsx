import { useEffect, useState } from 'react';
import type { AppSnapshot, AppSettings } from '../shared/contracts';
import type { WritingLevel } from './writingPresentation';
import { Providers } from './settings/Providers';
import { AudioSettings, PrivacySettings, WritingSettings } from './settings/Preferences';
import type { ChangeSetting, RunAction } from './settings/types';

export type { RunAction } from './settings/types';
const tabs = [
  { id: 'providers', label: '模型服务' },
  { id: 'audio', label: '声音与快捷键' },
  { id: 'writing', label: '文字整理' },
  { id: 'privacy', label: '隐私与权限' },
] as const;
export type SettingsTab = typeof tabs[number]['id'];

export function Settings({ snapshot, run, initialTab = 'providers' }: { snapshot: AppSnapshot; run: RunAction; initialTab?: SettingsTab }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [form, setForm] = useState<AppSettings>(() => structuredClone(snapshot.settings));
  const [keys, setKeys] = useState({ asr: '', cleanup: '' });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!dirty) setForm(structuredClone(snapshot.settings)); }, [snapshot.settings, dirty]);
  const change: ChangeSetting = (key, patch) => {
    setDirty(true);
    setForm(previous => ({ ...previous, [key]: { ...previous[key], ...patch } }));
  };
  function changePolish(level: WritingLevel) {
    setDirty(true);
    setForm(previous => ({ ...previous, cleanup: { ...previous.cleanup, enabled: level !== 'none' }, writing: { ...previous.writing, strength: level === 'light' ? 'light' : 'balanced' } }));
  }
  function changeKey(provider: 'asr' | 'cleanup', value: string) {
    setDirty(true);
    setKeys(previous => ({ ...previous, [provider]: value }));
  }
  async function save() {
    setBusy(true);
    try {
      const saved = await run({ type: 'settings.save', patch: form, secrets: {
        ...(keys.asr ? { asr: keys.asr } : {}), ...(keys.cleanup ? { cleanup: keys.cleanup } : {}),
      } });
      if (saved) { setKeys({ asr: '', cleanup: '' }); setDirty(false); }
    } finally { setBusy(false); }
  }
  async function deleteKey(provider: 'asr' | 'cleanup') {
    setBusy(true);
    try {
      const deleted = await run({ type: 'settings.save', patch: {}, secrets: { [provider]: '' } });
      if (deleted) setKeys(previous => ({ ...previous, [provider]: '' }));
    } finally { setBusy(false); }
  }
  const sectionProps = { form, snapshot, change };
  return <>
    <div className="page-heading settings-heading"><h1>设置</h1><div className="row-actions"><span className="settings-status" role="status">{dirty ? '未保存' : ''}</span><button className="primary" disabled={!dirty || busy} onClick={() => { void save(); }}>{busy ? '处理中…' : '保存设置'}</button></div></div>
    <div className="settings-tabs" role="tablist" aria-label="设置分类">{tabs.map(item => <button key={item.id} id={`settings-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`settings-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? 'selected' : ''} onClick={() => setTab(item.id)} onKeyDown={event => {
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!direction && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.findIndex(item => item.id === tab) + direction + tabs.length) % tabs.length;
      setTab(tabs[index].id);
      document.getElementById(`settings-tab-${tabs[index].id}`)?.focus();
    }}>{item.label}</button>)}</div>
    <div className="settings-section" role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
      <fieldset className="settings-body" disabled={busy}>
        {tab === 'providers' && <Providers {...sectionProps} keys={keys} changeKey={changeKey} deleteKey={deleteKey} run={run} dirty={dirty} />}
        {tab === 'audio' && <AudioSettings {...sectionProps} />}
        {tab === 'writing' && <WritingSettings {...sectionProps} changePolish={changePolish} />}
        {tab === 'privacy' && <PrivacySettings {...sectionProps} run={run} />}
      </fieldset>
    </div>
    <footer className="settings-footer"><span>Typeless {snapshot.version}</span><button className="text-button" onClick={() => { void run({ type: 'window.hide' }); }}>隐藏窗口</button><button className="text-button" onClick={() => { void run({ type: 'app.quit' }); }}>退出应用</button></footer>
  </>;
}
