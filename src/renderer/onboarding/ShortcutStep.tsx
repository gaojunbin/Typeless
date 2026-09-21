import { useRef } from 'react';
import type { AppSnapshot } from '../../shared/contracts';
import { KeyChips, StatusBadge } from '../ui';
import { shortcutLabel } from '../shortcutPresentation';
import { StepLayout } from './StepLayout';

export function ShortcutStep({ snapshot, onBack, onNext }: { snapshot: AppSnapshot; onBack: () => void; onNext: () => void }) {
  const mac = snapshot.platform === 'darwin';
  const primary = snapshot.platform === 'win32' ? 'RightAlt' : 'Fn';
  const name = shortcutLabel(primary, mac);
  const fallback = snapshot.settings.shortcut.fallback;
  const available = snapshot.permissions.primaryShortcutAvailable;
  // Presses counted since the step opened; main keeps counting while setup is incomplete.
  const entry = useRef(snapshot.permissions.shortcutPresses);
  const detected = snapshot.permissions.shortcutPresses > entry.current;
  return <StepLayout
    title="试试快捷键"
    subtitle={`在任何应用里，按一下 ${name} 开始听写，再按一下结束。`}
    onBack={onBack}
    hero={<div className="setup-feature-cards">
      <div className="setup-feature-card"><span className="setup-feature-title">听写</span><KeyChips binding={primary} mac={mac} size="keycap" /></div>
      <div className="setup-feature-card"><span className="setup-feature-title">备用</span><KeyChips binding={fallback} mac={mac} size="keycap" /></div>
    </div>}
    footerRight={<button type="button" className="primary" onClick={onNext}>继续</button>}>
    <div className="setup-block">
      <div className="setup-keyrow">
        <span className="setup-keyrow-title">现在按一下 {name}</span>
        <KeyChips binding={primary} mac={mac} size="keycap" />
      </div>
      {detected && <p className="shortcut-detected">
        <StatusBadge tone="ok">检测到 {available ? name : '备用快捷键'}</StatusBadge>
        <span>很好，快捷键可以用了。</span>
      </p>}
      {!available && <p className="setup-note">{name} 监听尚未就绪，可先用备用快捷键；稍后可在基本设置中查看。</p>}
      <div className="setup-keyrow">
        <span className="setup-keyrow-title">备用快捷键 · 任何时候都可用</span>
        <KeyChips binding={fallback} mac={mac} size="keycap" />
      </div>
    </div>
  </StepLayout>;
}
