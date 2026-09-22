import { useEffect, useState } from 'react';
import type { AppSnapshot } from '../../shared/contracts';
import { useI18n } from '../i18n';
import type { RunAction } from '../settings/types';
import { StatusBadge } from '../ui';
import { LevelMeter, useMicTest } from './MicTest';
import { StepLayout } from './StepLayout';

export function MicrophoneStep({ snapshot, run, onBack, onNext }: { snapshot: AppSnapshot; run: RunAction; onBack: () => void; onNext: () => void }) {
  const { t } = useI18n();
  const granted = snapshot.permissions.microphone === 'granted';
  const denied = snapshot.permissions.microphone === 'denied';
  const [deviceId, setDeviceId] = useState(snapshot.settings.audio.deviceId);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const test = useMicTest(deviceId, granted, run);
  useEffect(() => {
    let live = true;
    const load = async () => { try { const list = await navigator.mediaDevices.enumerateDevices(); if (live) setDevices(list.filter(device => device.kind === 'audioinput')); } catch { /* The system default remains available. */ } };
    void load(); navigator.mediaDevices.addEventListener('devicechange', load);
    return () => { live = false; navigator.mediaDevices.removeEventListener('devicechange', load); };
  }, [granted]);
  const select = (value: string) => { setDeviceId(value); void run({ type: 'settings.save', patch: { audio: { deviceId: value } } }); };
  return <StepLayout
    title={t('onboarding.microphone.title')}
    subtitle={t('onboarding.microphone.subtitle')}
    onBack={onBack}
    hero={<div className="setup-hero setup-hero-meter"><LevelMeter level={test.level} active={granted && !test.failed} /></div>}
    footerRight={<button type="button" className="primary" onClick={onNext}>{t('onboarding.continue')}</button>}>
    {granted ? <div className="setup-block">
      <p className="setup-prompt">{t('onboarding.microphone.prompt')}</p>
      <div className="setup-field">
        <label htmlFor="setup-microphone">{t('onboarding.label.microphone')}</label>
        <select id="setup-microphone" value={deviceId} onChange={event => select(event.target.value)}>
          <option value="default">{t('onboarding.microphone.systemDefault')}</option>
          {devices.filter(device => device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || t('onboarding.microphone.device', { index: index + 1 })}</option>)}
        </select>
      </div>
      {test.failed
        ? <p className="setup-alert" role="alert">{t('onboarding.microphone.failed')}</p>
        : test.detected && <p className="mic-detected"><StatusBadge tone="ok">{t('onboarding.microphone.detected')}</StatusBadge></p>}
    </div> : <div className="setup-block">
      <p className="setup-prompt">{t('onboarding.microphone.needsPermission')}</p>
      <div className="setup-actions">
        <button type="button" className="primary" onClick={() => { void run({ type: 'permissions.request', permission: 'microphone' }); }}>{t('onboarding.allow')}</button>
        {denied && <button type="button" className="secondary" onClick={() => { void run({ type: 'permissions.open', pane: 'microphone' }); }}>{t('onboarding.openSystemSettings')}</button>}
      </div>
    </div>}
  </StepLayout>;
}
