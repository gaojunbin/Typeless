import type { DictationSession, Language } from '../shared/contracts';
import { catalog, translate, type MessageKey } from './i18n';

const recoveryKey = (code: string): MessageKey | undefined => {
  const key = `session.recovery.${code}` as MessageKey;
  return key in catalog.zh ? key : undefined;
};

export function recoveryMessage(session: DictationSession, language: Language): string {
  const t = (key: MessageKey) => translate(language, key);
  const known = session.errorCode ? recoveryKey(session.errorCode) : undefined;
  if (known) return t(known);
  if (/^asr_5\d\d$/.test(session.errorCode || '')) return t('session.recovery.asr_5xx');
  if (session.error) return t('session.recovery.generic');
  return warningMessage(session, language) || t(session.copied ? 'session.recovery.copiedReady' : 'session.recovery.textKept');
}

export function recoverySettings(session: DictationSession): 'ai' | 'basic' | undefined {
  if (['provider_not_configured', 'asr_configuration', 'asr_400', 'asr_402', 'asr_413', 'asr_421', 'asr_401', 'asr_403', 'asr_404', 'asr_network'].includes(session.errorCode || '')) return 'ai';
  if (['no_speech', 'microphone_disconnected', 'microphone_denied', 'microphone_unavailable', 'capture_failed', 'accessibility_denied', 'permission_required'].includes(session.errorCode || '')) return 'basic';
  if (session.warning?.includes('Text cleanup is not configured.')) return 'ai';
  return undefined;
}

export function warningMessage(session: DictationSession, language: Language): string {
  const t = (key: MessageKey) => translate(language, key);
  const warning = session.warning || '';
  const messages: string[] = [];
  if (warning.includes('Text cleanup is not configured.')) messages.push(t('session.warning.cleanupNotConfigured'));
  if (warning.includes('Text processing failed.')) messages.push(t('session.warning.cleanupFailed'));
  if (warning.includes('Numbers changed')) messages.push(t('session.warning.numbersChanged'));
  if (warning.includes('substantially expanded')) messages.push(t('session.warning.expanded'));
  if (warning.includes('formatting wrappers')) messages.push(t('session.warning.formatting'));
  if (session.errorCode === 'clipboard_changed') messages.push(t('session.warning.clipboardChanged'));
  else if (session.copied && session.errorCode) {
    if (['permission_required', 'accessibility_denied'].includes(session.errorCode)) messages.push(t('session.warning.pasteNeedsPermission'));
    else if (['paste_uncertain', 'insertion_uncertain', 'native_timeout', 'native_protocol_error', 'helper_unavailable'].includes(session.errorCode)) messages.push(t('session.warning.pasteUncertain'));
    else if (['paste_failed', 'event_unavailable', 'request_expired', 'invalid_request', 'cancelled'].includes(session.errorCode)) messages.push(t('session.warning.pasteFailed'));
    else messages.push(t('session.warning.pasteUncertain'));
  } else if (session.delivery === 'dispatched') messages.push(t(session.rawText !== session.text ? 'session.warning.polishedPasted' : 'session.warning.pasted'));
  else if (messages.length && session.copied) messages.push(t('session.warning.copied'));
  return messages.join(' ');
}
