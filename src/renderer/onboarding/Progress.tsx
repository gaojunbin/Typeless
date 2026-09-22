import { ChevronRight } from 'lucide-react';
import type { AppSnapshot } from '../../shared/contracts';
import { useI18n, type MessageKey } from '../i18n';
import { grantedCards, permissionCards } from './permissionCards';

export type SetupStep = 'permissions' | 'microphone' | 'shortcut' | 'done';

const steps: readonly { id: SetupStep; labelKey: MessageKey }[] = [
  { id: 'permissions', labelKey: 'onboarding.step.permissions' },
  { id: 'microphone', labelKey: 'onboarding.label.microphone' },
  { id: 'shortcut', labelKey: 'onboarding.label.shortcut' },
  { id: 'done', labelKey: 'onboarding.step.done' },
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
  const { t } = useI18n();
  const value = completion(step, snapshot);
  return <header className="setup-progress">
    <nav aria-label={t('onboarding.progress.label')}>
      <ol>
        {steps.map((item, index) => <li key={item.id} aria-current={item.id === step ? 'step' : undefined}>
          {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
          <span>{t(item.labelKey)}</span>
        </li>)}
      </ol>
    </nav>
    <div className="setup-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <i style={{ width: `${value}%` }} />
    </div>
  </header>;
}
