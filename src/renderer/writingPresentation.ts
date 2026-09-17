import type { AppSettings } from '../shared/contracts';

export type WritingLevel = 'none' | 'light' | 'strong';

export function writingLevel(settings: AppSettings): WritingLevel {
  return !settings.cleanup.enabled ? 'none' : settings.writing.strength === 'light' ? 'light' : 'strong';
}

export const writingLevels: { value: WritingLevel; label: string; hint: string }[] = [
  { value: 'none', label: '不润色', hint: '保留识别原文，不调用润色模型。' },
  { value: 'light', label: '轻度润色', hint: '只清理语气词和少量重复，尽量保留原话。' },
  { value: 'strong', label: '强力润色', hint: '清理语气词、重复、改口和冗余，保留事实与原意，不补写内容。' },
];
