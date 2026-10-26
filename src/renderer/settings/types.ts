import type { AppAction, AppSnapshot } from '../../shared/contracts';
import type { MessageKey } from '../i18n';

export type RunAction = (action: AppAction) => Promise<boolean>;
export interface SettingsSectionProps {
  snapshot: AppSnapshot;
  run: RunAction;
}

/** The four destinations in sidebar order; labels resolve through `useI18n()`. */
export const pages: readonly { id: 'home' | 'ai' | 'vocabulary' | 'basic'; labelKey: MessageKey }[] = [
  { id: 'home', labelKey: 'common.page.home' },
  { id: 'ai', labelKey: 'common.page.ai' },
  { id: 'vocabulary', labelKey: 'common.page.vocabulary' },
  { id: 'basic', labelKey: 'common.page.basic' },
];
export type Page = typeof pages[number]['id'];
export type SettingsTab = Exclude<Page, 'home'>;
