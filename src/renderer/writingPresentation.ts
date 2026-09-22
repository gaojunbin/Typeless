import type { AppSettings } from '../shared/contracts';
import type { MessageKey } from './i18n';

export type WritingLevel = 'none' | 'light' | 'strong';

export function writingLevel(settings: AppSettings): WritingLevel {
  return !settings.cleanup.enabled ? 'none' : settings.writing.strength === 'light' ? 'light' : 'strong';
}

/** The three levels in display order; components resolve the keys through `useI18n()`. */
export const writingLevels: { value: WritingLevel; labelKey: MessageKey; hintKey: MessageKey }[] = [
  { value: 'none', labelKey: 'common.writing.none.label', hintKey: 'common.writing.none.hint' },
  { value: 'light', labelKey: 'common.writing.light.label', hintKey: 'common.writing.light.hint' },
  { value: 'strong', labelKey: 'common.writing.strong.label', hintKey: 'common.writing.strong.hint' },
];
