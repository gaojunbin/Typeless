import type { NativeStatus } from './native-client';

export function shortcutPermissions(status: NativeStatus, primary: string, fallbackAvailable: boolean) {
  const normalized = primary.toLowerCase().replace(/[ _-]/g, '');
  const binding = normalized === 'fn' ? 'fn' : normalized === 'rightalt' ? 'right-alt' : 'disabled';
  const primaryAvailable = !status.error && binding !== 'disabled' && status.binding === binding && status.shortcutAvailable;
  const message = binding === 'disabled' ? 'disabled' : status.error ? 'helper_unavailable'
    : status.binding !== binding ? 'binding_mismatch' : primaryAvailable ? 'ready'
    : status.shortcutReason || (status.inputMonitoring ? 'tap_disabled' : 'input_monitoring_denied');
  return {
    inputMonitoring: status.inputMonitoring,
    primaryShortcutAvailable: primaryAvailable,
    fallbackShortcutAvailable: fallbackAvailable,
    shortcutMessage: message,
  };
}
