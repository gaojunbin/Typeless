import { useEffect, useState } from 'react';
import type { AppSnapshot } from '../../shared/contracts';
import type { RunAction } from '../settings/types';
import { StatusBadge } from '../ui';
import { LevelMeter, useMicTest } from './MicTest';
import { StepLayout } from './StepLayout';

export function MicrophoneStep({ snapshot, run, onBack, onNext }: { snapshot: AppSnapshot; run: RunAction; onBack: () => void; onNext: () => void }) {
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
    title="说几句话，测试麦克风"
    subtitle="看到蓝色音量条随声音跳动即可。"
    onBack={onBack}
    hero={<div className="setup-hero setup-hero-meter"><LevelMeter level={test.level} active={granted && !test.failed} /></div>}
    footerRight={<button type="button" className="primary" onClick={onNext}>继续</button>}>
    {granted ? <div className="setup-block">
      <p className="setup-prompt">说话时能看到蓝色的条在动吗？</p>
      <div className="setup-field">
        <label htmlFor="setup-microphone">麦克风</label>
        <select id="setup-microphone" value={deviceId} onChange={event => select(event.target.value)}>
          <option value="default">系统默认</option>
          {devices.filter(device => device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `麦克风 ${index + 1}`}</option>)}
        </select>
      </div>
      {test.failed
        ? <p className="setup-alert" role="alert">无法访问麦克风，请检查是否被其他应用占用。</p>
        : test.detected && <p className="mic-detected"><StatusBadge tone="ok">已检测到声音</StatusBadge></p>}
    </div> : <div className="setup-block">
      <p className="setup-prompt">先允许 Typeless 使用麦克风</p>
      <div className="setup-actions">
        <button type="button" className="primary" onClick={() => { void run({ type: 'permissions.request', permission: 'microphone' }); }}>允许</button>
        {denied && <button type="button" className="secondary" onClick={() => { void run({ type: 'permissions.open', pane: 'microphone' }); }}>打开系统设置</button>}
      </div>
    </div>}
  </StepLayout>;
}
