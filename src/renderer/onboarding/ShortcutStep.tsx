import { useRef } from 'react';
import type { AppSnapshot } from '../../shared/contracts';
import { useI18n } from '../i18n';
import { KeyChips, StatusBadge } from '../ui';
import { shortcutLabel } from '../shortcutPresentation';
import { StepLayout } from './StepLayout';

export function ShortcutStep({ snapshot, onBack, onNext }: { snapshot: AppSnapshot; onBack: () => void; onNext: () => void }) {
  const { t } = useI18n();
  const mac = snapshot.platform === 'darwin';
  const primary = snapshot.platform === 'win32' ? 'RightAlt' : 'Fn';
  const name = shortcutLabel(primary, mac);
  const fallback = snapshot.settings.shortcut.fallback;
  const available = snapshot.permissions.primaryShortcutAvailable;
  // Presses counted since the step opened; main keeps counting while setup is incomplete.
  const entry = useRef(snapshot.permissions.shortcutPresses);
  const detected = snapshot.permissions.shortcutPresses > entry.current;
  return <StepLayout
    title={t('onboarding.shortcut.title')}
    subtitle={t('onboarding.shortcut.subtitle', { key: name })}
    onBack={onBack}
    hero={<div className="setup-feature-cards">
      <div className="setup-feature-card"><span className="setup-feature-title">{t('onboarding.shortcut.dictation')}</span><KeyChips binding={primary} mac={mac} size="keycap" /></div>
      <div className="setup-feature-card"><span className="setup-feature-title">{t('onboarding.shortcut.fallbackShort')}</span><KeyChips binding={fallback} mac={mac} size="keycap" /></div>
    </div>}
    footerRight={<button type="button" className="primary" onClick={onNext}>{t('onboarding.continue')}</button>}>
    <div className="setup-block">
      <div className="setup-keyrow">
        <span className="setup-keyrow-title">{t('onboarding.shortcut.pressNow', { key: name })}</span>
        <KeyChips binding={primary} mac={mac} size="keycap" />
      </div>
      {detected && <p className="shortcut-detected">
        <StatusBadge tone="ok">{t('onboarding.shortcut.detected', { key: available ? name : t('onboarding.shortcut.fallback') })}</StatusBadge>
        <span>{t('onboarding.shortcut.working')}</span>
      </p>}
      {!available && <p className="setup-note">{t('onboarding.shortcut.notReady', { key: name })}</p>}
      <div className="setup-keyrow">
        <span className="setup-keyrow-title">{t('onboarding.shortcut.fallbackRow')}</span>
        <KeyChips binding={fallback} mac={mac} size="keycap" />
      </div>
    </div>
  </StepLayout>;
}
