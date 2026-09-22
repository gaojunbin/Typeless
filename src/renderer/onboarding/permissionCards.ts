import type { AppSnapshot } from '../../shared/contracts';
import { shortcutDisabled } from './permissionStatus';

export type PermissionId = 'microphone' | 'accessibility' | 'helper';
/** Card lifecycle from docs/UI_DESIGN.md section 12.3. */
export type PermissionState = 'pending' | 'denied' | 'stale' | 'granted';

export interface PermissionCardModel {
  id: PermissionId;
  title: string;
  body: string;
  state: PermissionState;
  /** Manual path revealed by the "为什么需要此权限" toggle. */
  hint?: string;
  deniedBody?: string;
}

function microphoneState(snapshot: AppSnapshot): PermissionState {
  const value = snapshot.permissions.microphone;
  return value === 'granted' ? 'granted' : value === 'denied' ? 'denied' : 'pending';
}

function accessibilityState(snapshot: AppSnapshot): PermissionState {
  const { accessibility, primaryShortcutAvailable, shortcutMessage } = snapshot.permissions;
  if (accessibility && (primaryShortcutAvailable || shortcutDisabled(snapshot))) return 'granted';
  // The helper holds a listening grant through accessibility or input monitoring, yet its tap still fails.
  if (shortcutMessage === 'relaunch_required') return 'stale';
  return 'pending';
}

export function permissionCards(snapshot: AppSnapshot): PermissionCardModel[] {
  const cards: PermissionCardModel[] = [{
    id: 'microphone',
    title: '允许 Typeless 使用麦克风',
    body: '只在你按下快捷键听写时访问麦克风。',
    hint: '系统设置 → 隐私与安全性 → 麦克风 → 开启 Typeless',
    deniedBody: '系统已拒绝麦克风权限。请在系统设置中开启后返回。',
    state: microphoneState(snapshot),
  }];
  if (snapshot.platform === 'darwin') cards.push({
    id: 'accessibility',
    title: '允许 Typeless 粘贴文字并监听 Fn 键',
    body: 'Typeless 需要辅助功能权限，才能把结果粘贴到当前输入框，并识别单独按下的 Fn。',
    hint: '系统设置 → 隐私与安全性 → 辅助功能 → 开启 Typeless',
    state: accessibilityState(snapshot),
  });
  if (snapshot.platform === 'win32') cards.push({
    id: 'helper',
    title: '启用系统输入助手',
    body: 'Typeless 通过内置助手识别 Right Alt 并粘贴文字，无需额外授权。',
    deniedBody: '助手不可用，可先使用备用快捷键。',
    state: snapshot.permissions.nativeAvailable ? 'granted' : 'denied',
  });
  return cards;
}

export const grantedCards = (cards: PermissionCardModel[]) => cards.filter(card => card.state === 'granted').length;
