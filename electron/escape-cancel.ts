import type { DictationSession } from '../src/shared/contracts';

interface ShortcutRegistry {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
  isRegistered(accelerator: string): boolean;
}

const cancellable: DictationSession['status'][] = ['arming', 'recording', 'transcribing', 'polishing', 'inserting'];

// Escape cancels dictation, but is held only while a session can be cancelled so other applications keep it otherwise.
export class EscapeCancel {
  constructor(private shortcuts: ShortcutRegistry, private cancel: () => void, private key = 'Escape') {}

  sync(status: DictationSession['status']) {
    const wanted = cancellable.includes(status);
    const held = this.shortcuts.isRegistered(this.key);
    if (wanted && !held) { try { this.shortcuts.register(this.key, this.cancel); } catch { /* The capsule cancel control remains. */ } }
    if (!wanted && held) this.shortcuts.unregister(this.key);
  }
}
