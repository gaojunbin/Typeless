import type { AppAction, AppSnapshot } from '../../shared/contracts';

export type RunAction = (action: AppAction) => Promise<boolean>;
export interface SettingsSectionProps {
  snapshot: AppSnapshot;
  run: RunAction;
}

export const pages = [
  { id: 'home', label: '首页' },
  { id: 'ai', label: 'AI 配置' },
  { id: 'basic', label: '基本设置' },
] as const;
export type Page = typeof pages[number]['id'];
export type SettingsTab = Exclude<Page, 'home'>;
