import type { AppSnapshot, Platform } from '../../shared/contracts';
import type { MessageKey, Translate } from '../i18n';

/** Shortcut health codes mapped to the copy shared by 基本设置 and the setup guide. */
export const shortcutStatusMessages: Record<string, MessageKey> = {
  helper_unavailable: 'onboarding.status.helperReconnecting', input_monitoring_denied: 'onboarding.status.accessibilityNeeded',
  tap_disabled: 'onboarding.status.tapInactive', tap_creation_failed: 'onboarding.status.tapInactive', runloop_source_failed: 'onboarding.status.tapInactive',
  relaunch_required: 'onboarding.status.relaunchRequired',
  binding_mismatch: 'onboarding.status.bindingMismatch', ready: 'onboarding.status.ready', disabled: 'onboarding.status.off',
};

export interface PermissionStatus {
  text: string;
  tone: 'ok' | 'warn' | 'muted';
  /** True when the row needs no further action from the user. */
  ok: boolean;
}

export const shortcutDisabled = (snapshot: AppSnapshot) => snapshot.settings.shortcut.primary.toLowerCase() === 'disabled';
export const assistantLabel = (platform: Platform, t: Translate) => t(platform === 'darwin' ? 'onboarding.label.accessibility' : 'onboarding.label.helper');

export function primaryShortcutStatus(snapshot: AppSnapshot, t: Translate): PermissionStatus {
  if (shortcutDisabled(snapshot)) return { text: t('onboarding.status.off'), tone: 'muted', ok: true };
  if (snapshot.permissions.primaryShortcutAvailable) return { text: t('onboarding.status.ready'), tone: 'ok', ok: true };
  return { text: t(shortcutStatusMessages[snapshot.permissions.shortcutMessage] || 'onboarding.status.unavailableNow'), tone: 'warn', ok: false };
}

export function microphoneStatus(snapshot: AppSnapshot, t: Translate): PermissionStatus {
  const granted = snapshot.permissions.microphone === 'granted';
  return { text: t(granted ? 'onboarding.status.granted' : 'onboarding.status.pending'), tone: granted ? 'ok' : 'warn', ok: granted };
}

/** Input monitoring is covered by accessibility, so a separate grant is only ever a bonus. */
export function inputMonitoringStatus(snapshot: AppSnapshot, t: Translate): PermissionStatus {
  if (snapshot.permissions.inputMonitoring) return { text: t('onboarding.status.granted'), tone: 'ok', ok: true };
  if (snapshot.permissions.accessibility) return { text: t('onboarding.status.coveredByAccessibility'), tone: 'ok', ok: true };
  return { text: t('onboarding.status.notGranted'), tone: 'warn', ok: false };
}

/** macOS reports the accessibility grant; Windows reports whether the bundled helper runs. */
export function assistantStatus(snapshot: AppSnapshot, t: Translate): PermissionStatus {
  if (snapshot.platform === 'darwin') {
    const granted = snapshot.permissions.accessibility;
    return { text: t(granted ? 'onboarding.status.granted' : 'onboarding.status.pending'), tone: granted ? 'ok' : 'warn', ok: granted };
  }
  const available = snapshot.permissions.nativeAvailable;
  return { text: t(available ? 'onboarding.status.ready' : 'onboarding.status.unavailable'), tone: available ? 'ok' : 'warn', ok: available };
}
