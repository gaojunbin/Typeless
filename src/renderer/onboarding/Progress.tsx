import { ChevronRight } from 'lucide-react';
import type { AppSnapshot } from '../../shared/contracts';
import { grantedCards, permissionCards } from './permissionCards';

export type SetupStep = 'permissions' | 'microphone' | 'shortcut' | 'done';

const steps: readonly { id: SetupStep; label: string }[] = [
  { id: 'permissions', label: '权限' },
  { id: 'microphone', label: '麦克风' },
  { id: 'shortcut', label: '快捷键' },
  { id: 'done', label: '完成' },
];

/** Permission progress fills the first quarter of the bar as cards turn green. */
function completion(step: SetupStep, snapshot: AppSnapshot) {
  if (step === 'microphone') return 55;
  if (step === 'shortcut') return 75;
  if (step === 'done') return 100;
  const cards = permissionCards(snapshot);
  return Math.round(15 + 25 * (grantedCards(cards) / Math.max(1, cards.length)));
}

export function Progress({ step, snapshot }: { step: SetupStep; snapshot: AppSnapshot }) {
  const value = completion(step, snapshot);
  return <header className="setup-progress">
    <nav aria-label="设置进度">
      <ol>
        {steps.map((item, index) => <li key={item.id} aria-current={item.id === step ? 'step' : undefined}>
          {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
          <span>{item.label}</span>
        </li>)}
      </ol>
    </nav>
    <div className="setup-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <i style={{ width: `${value}%` }} />
    </div>
  </header>;
}
