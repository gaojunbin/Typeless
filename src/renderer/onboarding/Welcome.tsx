import { AudioWaveform } from 'lucide-react';

export function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return <div className="setup-welcome-card">
    <AudioWaveform size={32} strokeWidth={2} aria-hidden="true" />
    <h1>欢迎使用 Typeless</h1>
    <p className="setup-subtitle">说话，不打字</p>
    <button type="button" className="primary setup-welcome-start" onClick={onStart}>开始设置</button>
    <button type="button" className="text-button" onClick={onSkip}>跳过向导</button>
  </div>;
}
