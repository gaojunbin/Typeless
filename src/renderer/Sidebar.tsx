import type { ComponentType } from 'react';
import { AudioWaveform, House, PenLine, Settings, Sparkles } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import { KeyChips, StatusBadge } from './ui';
import { pages, type Page } from './settings/types';

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;
const icons: Record<Page, IconComponent> = { home: House, ai: Sparkles, basic: Settings, style: PenLine };

export function Sidebar({ page, onNavigate, snapshot }: { page: Page; onNavigate: (page: Page) => void; snapshot: AppSnapshot }) {
  const { settings, permissions, platform } = snapshot;
  const off = settings.shortcut.primary.toLowerCase() === 'disabled';
  const shortcut = off ? settings.shortcut.fallback : settings.shortcut.primary;
  const available = off ? permissions.fallbackShortcutAvailable : permissions.primaryShortcutAvailable;
  const silent = shortcut.toLowerCase() === 'disabled';
  function move(key: string) {
    const direction = key === 'ArrowDown' || key === 'ArrowRight' ? 1 : key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 0;
    if (!direction && key !== 'Home' && key !== 'End') return;
    const index = key === 'Home' ? 0 : key === 'End' ? pages.length - 1 : (pages.findIndex(item => item.id === page) + direction + pages.length) % pages.length;
    onNavigate(pages[index].id);
    document.getElementById(`settings-tab-${pages[index].id}`)?.focus();
  }
  return <nav className="sidebar" aria-label="主导航">
    <div className="sidebar-brand"><AudioWaveform size={22} strokeWidth={2} aria-hidden="true" /><span>Typeless</span></div>
    <div className="sidebar-nav" role="tablist" aria-orientation="vertical">
      {pages.map(item => {
        const Icon = icons[item.id];
        return <button
          key={item.id}
          id={`settings-tab-${item.id}`}
          type="button"
          role="tab"
          className={`nav-item ${page === item.id ? 'selected' : ''}`.trim()}
          aria-selected={page === item.id}
          aria-controls={`settings-panel-${item.id}`}
          tabIndex={page === item.id ? 0 : -1}
          onClick={() => onNavigate(item.id)}
          onKeyDown={event => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); move(event.key); } }}
        ><Icon size={20} strokeWidth={1.5} /><span>{item.label}</span></button>;
      })}
    </div>
    <button type="button" className="card sidebar-footer" onClick={() => onNavigate('basic')}>
      <span className="sidebar-footer-caption">听写快捷键</span>
      <span className="sidebar-footer-row">
        {silent ? <span /> : <KeyChips binding={shortcut} mac={platform === 'darwin'} />}
        <StatusBadge tone={silent ? 'muted' : available ? 'ok' : 'warn'}>{silent ? '已关闭' : available ? '已就绪' : '不可用'}</StatusBadge>
      </span>
    </button>
  </nav>;
}
