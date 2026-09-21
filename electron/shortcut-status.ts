import type { NativeStatus } from './native-client';

const staleTapReasons = ['tap_creation_failed', 'tap_disabled', 'runloop_source_failed'];

export function shortcutPermissions(status: NativeStatus, primary: string, fallbackAvailable: boolean) {
  const normalized = primary.toLowerCase().replace(/[ _-]/g, '');
  const binding = normalized === 'fn' ? 'fn' : normalized === 'rightalt' ? 'right-alt' : 'disabled';
  const primaryAvailable = !status.error && binding !== 'disabled' && status.binding === binding && status.shortcutAvailable;
  const reason = status.shortcutReason || (status.inputMonitoring ? 'tap_disabled' : 'input_monitoring_denied');
  // An authorized helper whose event tap still fails is recovered by restarting the helper, then the whole app.
  const stale = staleTapReasons.includes(reason) && (status.accessibility || status.inputMonitoring);
  const message = binding === 'disabled' ? 'disabled' : status.error ? 'helper_unavailable'
    : status.binding !== binding ? 'binding_mismatch' : primaryAvailable ? 'ready'
    : stale ? (status.restartsExhausted ? 'relaunch_required' : 'tap_stale') : reason;
  return {
    inputMonitoring: status.inputMonitoring,
    primaryShortcutAvailable: primaryAvailable,
    fallbackShortcutAvailable: fallbackAvailable,
    shortcutMessage: message,
  };
}
