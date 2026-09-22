import type { ReactNode } from 'react';
import { ChevronRight, Keyboard, Mic, PenLine } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import type { RunAction, SettingsTab } from './settings/types';
import { PageHeader, StatusBadge } from './ui';
import { useI18n } from './i18n';
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
  const { t } = useI18n();
  const asrProtocol = t(settings.asr.kind === 'mimo' ? 'common.protocol.mimo' : 'common.protocol.openai');
  const asrReady = settings.asr.hasApiKey && Boolean(settings.asr.model.trim());
  const level = writingLevel(settings);
  const levelItem = writingLevels.find(item => item.value === level);
  const levelLabel = levelItem ? t(levelItem.labelKey) : '';
  const cleanupReady = settings.cleanup.hasApiKey && Boolean(settings.cleanup.model.trim());
  const off = settings.shortcut.primary.toLowerCase() === 'disabled';
  const shortcut = off ? settings.shortcut.fallback : settings.shortcut.primary;
  const available = off ? permissions.fallbackShortcutAvailable : permissions.primaryShortcutAvailable;
  const silent = shortcut.toLowerCase() === 'disabled';
  return <>
    <PageHeader title={t('home.title')} />
    <DictationPanel snapshot={snapshot} run={run} openSettings={openSettings} />
    <div className="status-list">
      <StatusRow
        icon={<Mic size={20} strokeWidth={1.5} aria-hidden="true" />}
        label={t('home.status.asr')}
        detail={asrReady ? [asrProtocol, settings.asr.model.trim()].filter(Boolean).join(' · ') : t('home.status.pending')}
        tone={asrReady ? 'ok' : 'warn'}
        badge={t(asrReady ? 'home.status.connected' : 'home.status.pending')}
        onOpen={() => openSettings('ai')}
      />
      <StatusRow
        icon={<PenLine size={20} strokeWidth={1.5} aria-hidden="true" />}
        label={t('home.status.cleanup')}
        detail={level === 'none' ? levelLabel : cleanupReady ? [levelLabel, settings.cleanup.model.trim()].filter(Boolean).join(' · ') : t('home.status.noCleanupModel')}
        tone={level === 'none' ? 'muted' : cleanupReady ? 'ok' : 'warn'}
        badge={t(level === 'none' ? 'home.status.off' : cleanupReady ? 'home.status.connected' : 'home.status.notConfigured')}
        onOpen={() => openSettings('ai')}
      />
      <StatusRow
        icon={<Keyboard size={20} strokeWidth={1.5} aria-hidden="true" />}
        label={t('home.status.shortcut')}
        detail={silent ? t('home.status.off') : shortcutLabel(shortcut, platform === 'darwin')}
        tone={silent ? 'muted' : available ? 'ok' : 'warn'}
        badge={t(silent ? 'home.status.off' : available ? 'home.status.ready' : 'home.status.unavailable')}
        onOpen={() => openSettings('basic')}
      />
    </div>
  </>;
}
