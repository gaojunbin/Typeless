import { describe, expect, it } from 'vitest';
import { shortcutPermissions } from '../electron/shortcut-status';
import type { NativeStatus } from '../electron/native-client';

const available: NativeStatus = { platform: 'darwin', accessibility: true, inputMonitoring: true, shortcutAvailable: true, binding: 'fn' };

describe('shortcut permission presentation', () => {
  it('does not let a working fallback hide unavailable Fn monitoring', () => {
    expect(shortcutPermissions({ ...available, inputMonitoring: false, shortcutAvailable: false, shortcutReason: 'input_monitoring_denied' }, 'Fn', true)).toEqual({
      inputMonitoring: false, primaryShortcutAvailable: false, fallbackShortcutAvailable: true, shortcutMessage: 'input_monitoring_denied',
    });
  });
  it('reports the configured native shortcut separately from a failed fallback', () => {
    expect(shortcutPermissions(available, 'Fn', false)).toMatchObject({ primaryShortcutAvailable: true, fallbackShortcutAvailable: false, shortcutMessage: 'ready' });
  });
  it('does not report a disabled or mismatched native binding as available', () => {
    expect(shortcutPermissions(available, 'Disabled', true)).toMatchObject({ primaryShortcutAvailable: false, shortcutMessage: 'disabled' });
    expect(shortcutPermissions({ ...available, binding: 'disabled' }, 'Fn', true)).toMatchObject({ primaryShortcutAvailable: false, shortcutMessage: 'binding_mismatch' });
  });
  it('reports helper failure and recovers the primary status independently', () => {
    expect(shortcutPermissions({ ...available, error: 'Native helper stopped.' }, 'Fn', true)).toMatchObject({ primaryShortcutAvailable: false, shortcutMessage: 'helper_unavailable' });
    expect(shortcutPermissions(available, 'Fn', true)).toMatchObject({ primaryShortcutAvailable: true, shortcutMessage: 'ready' });
  });
});
