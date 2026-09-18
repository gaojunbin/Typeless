import type { AppSnapshot } from '../shared/contracts';
import { Providers } from './settings/Providers';
import { BasicSettings, WritingSettings } from './settings/Preferences';
import type { RunAction } from './settings/types';

export type { RunAction } from './settings/types';
const tabs = [
  { id: 'ai', label: 'AI 配置' },
  { id: 'basic', label: '基本设置' },
  { id: 'style', label: '表达风格' },
] as const;
export type SettingsTab = typeof tabs[number]['id'];

export function Settings({ snapshot, run, tab, onTabChange: setTab }: { snapshot: AppSnapshot; run: RunAction; tab: SettingsTab; onTabChange: (tab: SettingsTab) => void }) {
  return <>
    <div className="settings-tabs" role="tablist" aria-label="设置分类">{tabs.map(item => <button key={item.id} id={`settings-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`settings-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? 'selected' : ''} onClick={() => setTab(item.id)} onKeyDown={event => {
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!direction && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.findIndex(item => item.id === tab) + direction + tabs.length) % tabs.length;
      setTab(tabs[index].id);
      document.getElementById(`settings-tab-${tabs[index].id}`)?.focus();
    }}>{item.label}</button>)}</div>
    {tabs.map(item => <div key={item.id} hidden={tab !== item.id} className="settings-section" role="tabpanel" id={`settings-panel-${item.id}`} aria-labelledby={`settings-tab-${item.id}`}>
      {item.id === 'ai' ? <Providers snapshot={snapshot} run={run} /> : item.id === 'basic' ? <BasicSettings snapshot={snapshot} run={run} /> : <WritingSettings snapshot={snapshot} run={run} />}
    </div>)}
  </>;
}
