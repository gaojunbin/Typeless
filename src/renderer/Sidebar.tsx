import type { ComponentType } from 'react';
import { CircleArrowUp, House, Settings, Sparkle } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import { BrandMark } from './ui';
import { pages, type Page } from './settings/types';

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;
const icons: Record<Page, IconComponent> = { home: House, ai: Sparkle, basic: Settings };

export function Sidebar({ page, onNavigate, snapshot }: { page: Page; onNavigate: (page: Page) => void; snapshot: AppSnapshot }) {
  const { update } = snapshot;
  function move(key: string) {
    const direction = key === 'ArrowDown' || key === 'ArrowRight' ? 1 : key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 0;
    if (!direction && key !== 'Home' && key !== 'End') return;
    const index = key === 'Home' ? 0 : key === 'End' ? pages.length - 1 : (pages.findIndex(item => item.id === page) + direction + pages.length) % pages.length;
    onNavigate(pages[index].id);
    document.getElementById(`settings-tab-${pages[index].id}`)?.focus();
  }
  return <nav className="sidebar" aria-label="主导航">
    <div className="sidebar-brand"><BrandMark size={22} /><span>Typeless</span></div>
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
    {update.status === 'available' && <button type="button" className="sidebar-update" onClick={() => onNavigate('basic')}>
      <CircleArrowUp size={16} strokeWidth={1.5} aria-hidden="true" />
      <span>有新版本 {update.latestVersion}</span>
    </button>}
  </nav>;
}
