import type { ReactNode } from 'react';
import { ArrowUpRight, Keyboard, Lock, Mic, ShieldCheck, Sparkles } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import type { RunAction, SettingsTab } from './settings/types';
import { Card, KeyChips, StatusBadge } from './ui';
import { DictationPanel } from './DictationPanel';
import { shortcutLabel } from './shortcutPresentation';
import { writingLevel, writingLevels } from './writingPresentation';

type Tone = 'ok' | 'warn' | 'muted';

function SetupCard({ icon, title, description, tone, badge, onOpen }: { icon: ReactNode; title: string; description: string; tone: Tone; badge: string; onOpen: () => void }) {
  return <button type="button" className="card setup-card" onClick={onOpen}>
    <span className="setup-tile">{icon}</span>
    <span className="setup-title">{title}</span>
    <span className="setup-description">{description}</span>
    <StatusBadge tone={tone}>{badge}</StatusBadge>
  </button>;
}

function StatusLine({ icon, value, unit }: { icon: ReactNode; value: string; unit: string }) {
  return <p className="status-line">{icon}<strong>{value}</strong><span>{unit}</span></p>;
}

export function Home({ snapshot, run, openSettings }: { snapshot: AppSnapshot; run: RunAction; openSettings: (tab: SettingsTab) => void }) {
  const { settings, permissions, platform } = snapshot;
  const mac = platform === 'darwin';
  const off = settings.shortcut.primary.toLowerCase() === 'disabled';
  const shortcut = off ? settings.shortcut.fallback : settings.shortcut.primary;
  const available = off ? permissions.fallbackShortcutAvailable : permissions.primaryShortcutAvailable;
  const asrProtocol = settings.asr.kind === 'mimo' ? '小米 MiMo' : 'OpenAI 兼容';
  const asrReady = settings.asr.hasApiKey && Boolean(settings.asr.model.trim());
  const level = writingLevel(settings);
  const levelLabel = writingLevels.find(item => item.value === level)?.label ?? '';
  const cleanupReady = settings.cleanup.hasApiKey && Boolean(settings.cleanup.model.trim());
  const micGranted = permissions.microphone === 'granted';
  return <>
    <h1 className="home-hero">说话，不打字</h1>
    <div className="home-grid">
      <div className="home-main">
        <DictationPanel snapshot={snapshot} run={run} openSettings={openSettings} />
        <Card className="shortcut-card">
          <div className="shortcut-row">
            <div className="shortcut-text"><p className="shortcut-title">听写</p><p className="shortcut-description">按一下开始，再按一下结束</p></div>
            {off ? <StatusBadge tone="muted">已关闭</StatusBadge> : <KeyChips binding={settings.shortcut.primary} mac={mac} size="keycap" />}
          </div>
          <div className="shortcut-row">
            <div className="shortcut-text"><p className="shortcut-title">备用快捷键</p><p className="shortcut-description">主快捷键不可用时的备选</p></div>
            <KeyChips binding={settings.shortcut.fallback} mac={mac} size="keycap" />
          </div>
        </Card>
        <h2 className="home-section">配置概览</h2>
        <div className="usecase-grid">
          <SetupCard
            icon={<Mic size={20} strokeWidth={1.5} aria-hidden="true" />}
            title="语音识别"
            description={[asrProtocol, settings.asr.model.trim()].filter(Boolean).join(' · ')}
            tone={asrReady ? 'ok' : 'warn'}
            badge={asrReady ? '已连接' : '待配置'}
            onOpen={() => openSettings('ai')}
          />
          <SetupCard
            icon={<Sparkles size={20} strokeWidth={1.5} className="mint" aria-hidden="true" />}
            title="文字润色"
            description={cleanupReady ? [levelLabel, settings.cleanup.model.trim()].filter(Boolean).join(' · ') : '未配置润色模型，保留原文'}
            tone={level === 'none' ? 'muted' : cleanupReady ? 'ok' : 'warn'}
            badge={level === 'none' ? '已关闭' : cleanupReady ? '已连接' : '未配置'}
            onOpen={() => openSettings(settings.cleanup.hasApiKey ? 'style' : 'ai')}
          />
          <SetupCard
            icon={<Keyboard size={20} strokeWidth={1.5} aria-hidden="true" />}
            title="快捷键与权限"
            description={`${shortcutLabel(shortcut, mac)} · 麦克风${micGranted ? '已授权' : '待授权'}`}
            tone={available && micGranted ? 'ok' : 'warn'}
            badge={available && micGranted ? '已就绪' : '需授权'}
            onOpen={() => openSettings('basic')}
          />
        </div>
      </div>
      <aside className="home-rail">
        <Card tone="muted" className="status-card">
          <StatusLine icon={<Mic size={18} strokeWidth={1.5} aria-hidden="true" />} value={asrProtocol} unit="语音识别" />
          <StatusLine icon={<Sparkles size={18} strokeWidth={1.5} aria-hidden="true" />} value={levelLabel} unit="润色程度" />
          <StatusLine icon={<Keyboard size={18} strokeWidth={1.5} aria-hidden="true" />} value={shortcutLabel(shortcut, mac)} unit={off ? '已关闭' : available ? '已就绪' : '不可用'} />
          <StatusLine icon={<ShieldCheck size={18} strokeWidth={1.5} aria-hidden="true" />} value="麦克风" unit={micGranted ? '已授权' : '待授权'} />
          <p className="status-privacy"><Lock size={14} strokeWidth={1.5} aria-hidden="true" /><button type="button" className="text-button" onClick={() => openSettings('ai')}>密钥只保存在本机</button></p>
        </Card>
        <button type="button" className="card link-card quickstart-card" onClick={() => openSettings('ai')}>
          <ArrowUpRight size={16} className="link-arrow" aria-hidden="true" />
          <span className="quickstart-title">三步开始</span>
          <span className="quickstart-step">1. 连接语音识别服务</span>
          <span className="quickstart-step">2. 选择润色程度</span>
          <span className="quickstart-step">3. 在任何应用按快捷键开口</span>
        </button>
      </aside>
    </div>
    <footer className="home-version">版本 {snapshot.version}</footer>
  </>;
}
