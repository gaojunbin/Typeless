import { useState } from 'react';
import type { AppSnapshot } from '../../shared/contracts';
import type { RunAction } from '../settings/types';
import { DoneStep } from './DoneStep';
import { MicrophoneStep } from './MicrophoneStep';
import { PermissionsStep } from './PermissionsStep';
import { Progress, type SetupStep } from './Progress';
import { ShortcutStep } from './ShortcutStep';
import { Welcome } from './Welcome';
import '../styles/onboarding.css';

type Step = 'welcome' | SetupStep;

/** First-run guide. It replaces the shell while settings.general.setupCompleted is false. */
export function SetupGuide({ snapshot, run }: { snapshot: AppSnapshot; run: RunAction }) {
  const [step, setStep] = useState<Step>('welcome');
  const finish = () => { void run({ type: 'settings.save', patch: { general: { setupCompleted: true } } }); };
  if (step === 'welcome') return <main className="onboarding onboarding-welcome" aria-label="设置向导">
    <Welcome onStart={() => setStep('permissions')} onSkip={finish} />
  </main>;
  return <main className="onboarding" aria-label="设置向导">
    <Progress step={step} snapshot={snapshot} />
    {step === 'permissions' ? <PermissionsStep snapshot={snapshot} run={run} onNext={() => setStep('microphone')} />
      : step === 'microphone' ? <MicrophoneStep snapshot={snapshot} run={run} onBack={() => setStep('permissions')} onNext={() => setStep('shortcut')} />
      : step === 'shortcut' ? <ShortcutStep snapshot={snapshot} onBack={() => setStep('microphone')} onNext={() => setStep('done')} />
      : <DoneStep snapshot={snapshot} onBack={() => setStep('shortcut')} onFinish={finish} />}
  </main>;
}
