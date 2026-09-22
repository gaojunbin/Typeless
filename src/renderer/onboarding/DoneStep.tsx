import { CircleAlert, CircleCheck } from 'lucide-react';
import type { AppSnapshot } from '../../shared/contracts';
import { useI18n, type Translate } from '../i18n';
import { assistantLabel, assistantStatus, microphoneStatus, primaryShortcutStatus, shortcutDisabled, type PermissionStatus } from './permissionStatus';
import { shortcutLabel } from '../shortcutPresentation';
import { CapsuleHero } from './CapsuleHero';
import { StepLayout } from './StepLayout';

function ChecklistRow({ label, status }: { label: string; status: PermissionStatus }) {
  return <p className="setup-check-row">
    {status.ok ? <CircleCheck size={18} className="check-ok" aria-hidden="true" /> : <CircleAlert size={18} className="check-warn" aria-hidden="true" />}
    <span className="check-label">{label}</span>
    <span className="check-value">{status.text}</span>
  </p>;
}

/** What is left after the guide, shown only while no speech key is saved. */
function NextSteps({ snapshot, t }: { snapshot: AppSnapshot; t: Translate }) {
  const mac = snapshot.platform === 'darwin';
  // The fallback chord carries dictation whenever the isolated primary key is turned off.
  const binding = shortcutDisabled(snapshot) ? snapshot.settings.shortcut.fallback : mac ? 'Fn' : 'RightAlt';
  return <div className="next-steps">
    <span className="next-steps-title">{t('onboarding.done.nextTitle')}</span>
    <p>{t('onboarding.done.next1')}</p>
    <p>{t('onboarding.done.next2')}</p>
    <p>{t('onboarding.done.next3', { key: shortcutLabel(binding, mac) })}</p>
  </div>;
}

export function DoneStep({ snapshot, onBack, onFinish }: { snapshot: AppSnapshot; onBack: () => void; onFinish: () => void }) {
  const { t } = useI18n();
  const connected = snapshot.settings.asr.hasApiKey;
  return <StepLayout
    title={t(connected ? 'onboarding.done.readyTitle' : 'onboarding.done.pendingTitle')}
    subtitle={connected ? undefined : t('onboarding.done.pendingSubtitle')}
    onBack={onBack}
    hero={<CapsuleHero />}
    footerLeft={<button type="button" className="text-button" onClick={onFinish}>{t('onboarding.done.later')}</button>}
    footerRight={<button type="button" className="primary" onClick={onFinish}>{t(connected ? 'onboarding.done.start' : 'onboarding.done.connect')}</button>}>
    <div className="setup-checklist">
      <ChecklistRow label={t('onboarding.label.microphone')} status={microphoneStatus(snapshot, t)} />
      <ChecklistRow label={assistantLabel(snapshot.platform, t)} status={assistantStatus(snapshot, t)} />
      <ChecklistRow label={t('onboarding.label.shortcut')} status={primaryShortcutStatus(snapshot, t)} />
    </div>
    {!connected && <NextSteps snapshot={snapshot} t={t} />}
  </StepLayout>;
}
