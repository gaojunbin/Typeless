import { Check, X } from 'lucide-react';

const bars = Array.from({ length: 10 }, (_, index) => index);

/** Static preview of the recording capsule described in docs/UI_DESIGN.md section 8, drawn locally. */
export function CapsuleHero() {
  return <div className="setup-hero setup-hero-capsule" aria-hidden="true">
    <span className="capsule-preview">
      <span className="capsule-circle capsule-cancel"><X size={16} strokeWidth={2.5} /></span>
      <span className="capsule-wave">{bars.map(index => <i key={index} />)}</span>
      <span className="capsule-circle capsule-confirm"><Check size={16} strokeWidth={2.5} /></span>
    </span>
    <span className="capsule-caption">听写时会出现在屏幕底部</span>
  </div>;
}
