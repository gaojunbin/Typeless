import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, Clock, Copy, Keyboard, Mic, PenLine, Trash2 } from 'lucide-react';
import type { AppSnapshot, DictationHistoryEntry } from '../shared/contracts';
import type { RunAction, SettingsTab } from './settings/types';
import { clockText, PageHeader, StatusBadge } from './ui';
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

function formatTime(epochMs: number): string {
  try {
    const d = new Date(epochMs);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function HistorySection({ history, run }: { history: DictationHistoryEntry[]; run: RunAction }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyItem(id: string) {
    if (await run({ type: 'history.copy', id, source: 'result' })) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(current => (current === id ? null : current)), 1800);
    }
  }

  return <section className="history-section" aria-label={t('home.history.title')}>
    <div className="history-header">
      <button type="button" className="history-toggle" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>
        <Clock size={18} strokeWidth={1.5} aria-hidden="true" />
        <span className="history-title">{t('home.history.title')}</span>
        <StatusBadge tone="muted">{t('home.history.count', { count: history.length })}</StatusBadge>
        <span className="history-toggle-label">{t(expanded ? 'home.history.hide' : 'home.history.show')}</span>
        <ChevronDown size={16} strokeWidth={1.5} className={`history-chevron ${expanded ? 'open' : ''}`.trim()} aria-hidden="true" />
      </button>
      {expanded && history.length > 0 && (
        <button type="button" className="text-button history-clear" onClick={() => { void run({ type: 'history.clear' }); }}>
          {t('home.history.clear')}
        </button>
      )}
    </div>
    {expanded && (
      history.length === 0
        ? <p className="history-empty">{t('home.history.empty')}</p>
        : <ul className="history-list">
          {history.map(item => {
            const copied = copiedId === item.id;
            const shown = item.text || item.rawText;
            return <li key={item.id} className="history-item">
              <div className="history-item-meta">
                <span>{formatTime(item.startedAt)} · {clockText(item.durationMs)}</span>
                <div className="history-item-actions">
                  <button
                    type="button"
                    className={`icon-button ${copied ? 'with-label' : ''}`.trim()}
                    aria-label={t(copied ? 'common.copied' : 'home.history.copy')}
                    onClick={() => { void copyItem(item.id); }}
                  >
                    {copied ? <><Check size={14} /><span>{t('common.copied')}</span></> : <Copy size={14} />}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('home.history.delete')}
                    onClick={() => { void run({ type: 'history.delete', id: item.id }); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="history-item-text">{shown}</p>
            </li>;
          })}
        </ul>
    )}
  </section>;
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
    <HistorySection history={snapshot.history ?? []} run={run} />
  </>;
}
