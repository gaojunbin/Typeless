import type { AppSnapshot } from '../../shared/contracts';
import type { MessageKey } from '../i18n';
import { shortcutDisabled } from './permissionStatus';

export type PermissionId = 'microphone' | 'accessibility' | 'helper';
/** Card lifecycle from docs/UI_DESIGN.md section 12.3. */
export type PermissionState = 'pending' | 'denied' | 'stale' | 'granted';

/** The model carries message keys; the card component resolves them through `useI18n()`. */
export interface PermissionCardModel {
  id: PermissionId;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  state: PermissionState;
  /** Manual path revealed by the "为什么需要此权限" toggle. */
  hintKey?: MessageKey;
  deniedBodyKey?: MessageKey;
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
    titleKey: 'onboarding.permissions.microphone.title',
    bodyKey: 'onboarding.permissions.microphone.body',
    hintKey: 'onboarding.permissions.microphone.hint',
    deniedBodyKey: 'onboarding.permissions.microphone.denied',
    state: microphoneState(snapshot),
  }];
  if (snapshot.platform === 'darwin') cards.push({
    id: 'accessibility',
    titleKey: 'onboarding.permissions.accessibility.title',
    bodyKey: 'onboarding.permissions.accessibility.body',
    hintKey: 'onboarding.permissions.accessibility.hint',
    state: accessibilityState(snapshot),
  });
  if (snapshot.platform === 'win32') cards.push({
    id: 'helper',
    titleKey: 'onboarding.permissions.helper.title',
    bodyKey: 'onboarding.permissions.helper.body',
    deniedBodyKey: 'onboarding.permissions.helper.denied',
    state: snapshot.permissions.nativeAvailable ? 'granted' : 'denied',
  });
  return cards;
}

export const grantedCards = (cards: PermissionCardModel[]) => cards.filter(card => card.state === 'granted').length;
