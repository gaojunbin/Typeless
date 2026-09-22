import type { AppSnapshot, Platform } from '../../shared/contracts';

/** Shortcut health codes mapped to the copy shared by 基本设置 and the setup guide. */
export const shortcutStatusMessages: Record<string, string> = {
  helper_unavailable: '助手正在重新连接', input_monitoring_denied: '请授权辅助功能（升级后需移除旧条目重新添加）',
  tap_disabled: '监听未生效，请检查权限', tap_creation_failed: '监听未生效，请检查权限', runloop_source_failed: '监听未生效，请检查权限',
  relaunch_required: '已授权但监听未生效',
  binding_mismatch: '快捷键设置尚未生效', ready: '已就绪', disabled: '已关闭',
};

export interface PermissionStatus {
  text: string;
  tone: 'ok' | 'warn' | 'muted';
  /** True when the row needs no further action from the user. */
  ok: boolean;
}

export const shortcutDisabled = (snapshot: AppSnapshot) => snapshot.settings.shortcut.primary.toLowerCase() === 'disabled';
export const assistantLabel = (platform: Platform) => (platform === 'darwin' ? '辅助功能' : '系统输入助手');

export function primaryShortcutStatus(snapshot: AppSnapshot): PermissionStatus {
  if (shortcutDisabled(snapshot)) return { text: '已关闭', tone: 'muted', ok: true };
  if (snapshot.permissions.primaryShortcutAvailable) return { text: '已就绪', tone: 'ok', ok: true };
  return { text: shortcutStatusMessages[snapshot.permissions.shortcutMessage] || '暂不可用', tone: 'warn', ok: false };
}

export function microphoneStatus(snapshot: AppSnapshot): PermissionStatus {
  const granted = snapshot.permissions.microphone === 'granted';
  return { text: granted ? '已授权' : '待授权', tone: granted ? 'ok' : 'warn', ok: granted };
}

/** Input monitoring is covered by accessibility, so a separate grant is only ever a bonus. */
export function inputMonitoringStatus(snapshot: AppSnapshot): PermissionStatus {
  if (snapshot.permissions.inputMonitoring) return { text: '已授权', tone: 'ok', ok: true };
  if (snapshot.permissions.accessibility) return { text: '辅助功能已覆盖', tone: 'ok', ok: true };
  return { text: '未授权', tone: 'warn', ok: false };
}

/** macOS reports the accessibility grant; Windows reports whether the bundled helper runs. */
export function assistantStatus(snapshot: AppSnapshot): PermissionStatus {
  if (snapshot.platform === 'darwin') {
    const granted = snapshot.permissions.accessibility;
    return { text: granted ? '已授权' : '待授权', tone: granted ? 'ok' : 'warn', ok: granted };
  }
  const available = snapshot.permissions.nativeAvailable;
  return { text: available ? '已就绪' : '不可用', tone: available ? 'ok' : 'warn', ok: available };
}
