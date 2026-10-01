import { describe, expect, it, vi } from 'vitest';
import { EscapeCancel } from '../electron/escape-cancel';

function fixture() {
  const held = new Map<string, () => void>();
  const shortcuts = {
    register: vi.fn((key: string, callback: () => void) => { held.set(key, callback); return true; }),
    unregister: vi.fn((key: string) => { held.delete(key); }),
    isRegistered: (key: string) => held.has(key),
  };
  const cancel = vi.fn();
  return { held, shortcuts, cancel, escape: new EscapeCancel(shortcuts, cancel) };
}

describe('Escape cancellation', () => {
  it('holds Escape only while a session can be cancelled', () => {
    const { held, shortcuts, escape } = fixture();
    escape.sync('idle');
    expect(held.has('Escape')).toBe(false);
    for (const status of ['arming', 'recording', 'transcribing', 'polishing', 'inserting'] as const) {
      escape.sync(status);
      expect(held.has('Escape')).toBe(true);
    }
    expect(shortcuts.register).toHaveBeenCalledTimes(1);
    for (const status of ['ready', 'error', 'cancelled', 'idle'] as const) {
      escape.sync('recording'); escape.sync(status);
      expect(held.has('Escape')).toBe(false);
    }
  });

  it('cancels the session when Escape is pressed', () => {
    const { held, cancel, escape } = fixture();
    escape.sync('recording');
    held.get('Escape')!();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('registers again after every shortcut was cleared mid-session', () => {
    const { held, shortcuts, escape } = fixture();
    escape.sync('recording');
    held.clear();
    escape.sync('recording');
    expect(shortcuts.register).toHaveBeenCalledTimes(2);
    expect(held.has('Escape')).toBe(true);
  });

  it('survives a registry that refuses the key', () => {
    const { shortcuts, escape } = fixture();
    shortcuts.register.mockImplementation(() => { throw new Error('taken'); });
    expect(() => escape.sync('recording')).not.toThrow();
  });
});
