import type { ReactNode } from 'react';
import { ChevronRight, Keyboard, Mic, PenLine } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import type { RunAction, SettingsTab } from './settings/types';
import { PageHeader, StatusBadge } from './ui';
import { shortcutLabel } from './shortcutPresentation';
import { DictationPanel } from './DictationPanel';
import { writingLevel, writingLevels } from './writingPresentation';

type Tone = 'ok' | 'warn' | 'muted';

/** One row of the Home status list: icon, label with a detail line, status badge, chevron. */
function StatusRow({ icon, label, detail, tone, badge, onOpen }: { icon: ReactNode; label: string; detail: ReactNode; tone: Tone; badge: string; onOpen: () => void }) {
  return <button type="button" className="status-row" onClick={onOpen}>
    {icon}
    <span className="status-text">
      <span className="status-label">{label}</span>
      <span className="status-detail">{detail}</span>
    </span>
    <StatusBadge tone={tone}>{badge}</StatusBadge>
    <ChevronRight size={16} strokeWidth={1.5} className="status-chevron" aria-hidden="true" />
  </button>;
}

export function Home({ snapshot, run, openSettings }: { snapshot: AppSnapshot; run: RunAction; openSettings: (tab: SettingsTab) => void }) {
  const { settings, permissions, platform } = snapshot;
  const asrProtocol = settings.asr.kind === 'mimo' ? '小米 MiMo' : 'OpenAI 兼容';
  const asrReady = settings.asr.hasApiKey && Boolean(settings.asr.model.trim());
  const level = writingLevel(settings);
  const levelLabel = writingLevels.find(item => item.value === level)?.label ?? '';
  const cleanupReady = settings.cleanup.hasApiKey && Boolean(settings.cleanup.model.trim());
  const off = settings.shortcut.primary.toLowerCase() === 'disabled';
  const shortcut = off ? settings.shortcut.fallback : settings.shortcut.primary;
  const available = off ? permissions.fallbackShortcutAvailable : permissions.primaryShortcutAvailable;
  const silent = shortcut.toLowerCase() === 'disabled';
  return <>
    <PageHeader title="说话，不打字" />
    <DictationPanel snapshot={snapshot} run={run} openSettings={openSettings} />
    <div className="status-list">
      <StatusRow
        icon={<Mic size={20} strokeWidth={1.5} aria-hidden="true" />}
        label="语音识别"
        detail={asrReady ? [asrProtocol, settings.asr.model.trim()].filter(Boolean).join(' · ') : '待配置'}
        tone={asrReady ? 'ok' : 'warn'}
        badge={asrReady ? '已连接' : '待配置'}
        onOpen={() => openSettings('ai')}
      />
      <StatusRow
        icon={<PenLine size={20} strokeWidth={1.5} aria-hidden="true" />}
        label="文字润色"
        detail={level === 'none' ? levelLabel : cleanupReady ? [levelLabel, settings.cleanup.model.trim()].filter(Boolean).join(' · ') : '未配置润色模型'}
        tone={level === 'none' ? 'muted' : cleanupReady ? 'ok' : 'warn'}
        badge={level === 'none' ? '已关闭' : cleanupReady ? '已连接' : '未配置'}
        onOpen={() => openSettings('ai')}
      />
      <StatusRow
        icon={<Keyboard size={20} strokeWidth={1.5} aria-hidden="true" />}
        label="快捷键"
        detail={silent ? '已关闭' : shortcutLabel(shortcut, platform === 'darwin')}
        tone={silent ? 'muted' : available ? 'ok' : 'warn'}
        badge={silent ? '已关闭' : available ? '已就绪' : '不可用'}
        onOpen={() => openSettings('basic')}
      />
    </div>
  </>;
}
