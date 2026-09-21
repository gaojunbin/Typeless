import { Accessibility, Keyboard, Mic } from 'lucide-react';
import type { PermissionCardModel, PermissionId } from './permissionCards';

const icons = { microphone: Mic, accessibility: Accessibility, helper: Keyboard } as const;
const labels: Record<PermissionId, string> = { microphone: '麦克风', accessibility: '辅助功能', helper: '系统输入助手' };

/** Presentational mirror of the system privacy list: one switch per permission card. */
export function PrivacyHero({ cards }: { cards: PermissionCardModel[] }) {
  return <div className="setup-hero setup-hero-privacy" aria-hidden="true">
    {cards.map(card => {
      const Icon = icons[card.id];
      return <p key={card.id} className="privacy-row">
        <Icon size={18} strokeWidth={1.5} />
        <span className="privacy-label">{labels[card.id]}</span>
        <span className="privacy-switch" data-on={card.state === 'granted' ? 'true' : 'false'} />
      </p>;
    })}
    <span className="privacy-caption">系统设置 → 隐私与安全性</span>
  </div>;
}
