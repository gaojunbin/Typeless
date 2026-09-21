import { CircleAlert, CircleCheck } from 'lucide-react';
import type { AppSnapshot } from '../../shared/contracts';
import { assistantLabel, assistantStatus, microphoneStatus, primaryShortcutStatus, type PermissionStatus } from './permissionStatus';
import { CapsuleHero } from './CapsuleHero';
import { StepLayout } from './StepLayout';

function ChecklistRow({ label, status }: { label: string; status: PermissionStatus }) {
  return <p className="setup-check-row">
    {status.ok ? <CircleCheck size={18} className="check-ok" aria-hidden="true" /> : <CircleAlert size={18} className="check-warn" aria-hidden="true" />}
    <span className="check-label">{label}</span>
    <span className="check-value">{status.text}</span>
  </p>;
}

export function DoneStep({ snapshot, onBack, onFinish }: { snapshot: AppSnapshot; onBack: () => void; onFinish: () => void }) {
  const connected = snapshot.settings.asr.hasApiKey;
  return <StepLayout
    title={connected ? '一切就绪' : '还差最后一步'}
    subtitle={connected ? undefined : '连接语音识别服务后，就可以在任何应用里开口了。'}
    onBack={onBack}
    hero={<CapsuleHero />}
    footerLeft={<button type="button" className="text-button" onClick={onFinish}>稍后再说</button>}
    footerRight={<button type="button" className="primary" onClick={onFinish}>{connected ? '开始使用' : '去连接 AI 服务'}</button>}>
    <div className="setup-checklist">
      <ChecklistRow label="麦克风" status={microphoneStatus(snapshot)} />
      <ChecklistRow label={assistantLabel(snapshot.platform)} status={assistantStatus(snapshot)} />
      <ChecklistRow label="快捷键" status={primaryShortcutStatus(snapshot)} />
    </div>
  </StepLayout>;
}
