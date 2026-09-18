import type { DictationSession } from '../shared/contracts';

const recoveryMessages: Record<string, string> = {
  provider_not_configured: '请先配置语音模型和 API 密钥。',
  no_speech: '未检测到声音，请靠近麦克风再试。',
  microphone_disconnected: '麦克风已断开，请重新连接或选择其他设备。',
  microphone_denied: '麦克风未获授权，请在系统设置中允许访问。',
  microphone_unavailable: '麦克风不可用，请检查是否被占用或更换设备。',
  capture_failed: '录音未完成，请检查麦克风后重试。',
  asr_configuration: '语音模型配置不完整，请检查模型和密钥。',
  asr_400: '语音请求格式有误，请检查接口与模型配置。',
  asr_402: '语音服务余额不足，请检查服务账号。',
  asr_413: '录音超过服务大小限制，请缩短后重试。',
  asr_421: '语音服务限制了该请求，请检查服务配置。',
  asr_401: '语音服务密钥无效，请更新密钥。',
  asr_403: '语音服务拒绝访问，请检查账号权限。',
  asr_404: '找不到语音接口或模型，请检查服务配置。',
  asr_429: '语音服务请求过多，请稍后重试。',
  asr_network: '无法连接语音服务，请检查网络和服务地址。',
  asr_timeout: '语音服务响应超时，可重试；重试可能再次计费。',
  asr_audio: '录音数据无法识别，请重新录音。',
  asr_failed: '语音识别未完成，请稍后重试。',
  asr_provider: '语音服务未返回有效文字，请重新录音或重试。',
  clipboard_copy_failed: '自动复制失败，文字仍保留在下方，可重新复制。',
  cancelled: '录音已取消。',
};

export function recoveryMessage(session: DictationSession): string {
  if (session.errorCode && recoveryMessages[session.errorCode]) return recoveryMessages[session.errorCode];
  if (/^asr_5\d\d$/.test(session.errorCode || '')) return '语音服务暂时不可用，请稍后重试。';
  if (session.error) return '听写未完成，请重试；仍有问题时检查模型与麦克风设置。';
  return warningMessage(session) || (session.copied ? '已复制，可直接粘贴。' : '文字已保留，可在下方复制。');
}

export function recoverySettings(session: DictationSession): 'ai' | 'basic' | undefined {
  if (['provider_not_configured', 'asr_configuration', 'asr_400', 'asr_402', 'asr_413', 'asr_421', 'asr_401', 'asr_403', 'asr_404', 'asr_network'].includes(session.errorCode || '')) return 'ai';
  if (['no_speech', 'microphone_disconnected', 'microphone_denied', 'microphone_unavailable', 'capture_failed', 'accessibility_denied', 'permission_required'].includes(session.errorCode || '')) return 'basic';
  if (session.warning?.includes('Text cleanup is not configured.')) return 'ai';
  return undefined;
}

export function warningMessage(session: DictationSession): string {
  const warning = session.warning || '';
  const messages: string[] = [];
  if (warning.includes('Text cleanup is not configured.')) messages.push('未配置润色模型，本次保留识别原文。');
  if (warning.includes('Text processing failed.')) messages.push('润色未完成，本次保留识别原文。');
  if (warning.includes('Numbers changed')) messages.push('整理后的数字有变化，请对照原文确认。');
  if (warning.includes('substantially expanded')) messages.push('整理后的内容明显变长，请对照原文确认。');
  if (warning.includes('formatting wrappers')) messages.push('结果包含额外格式，请对照原文确认。');
  if (session.errorCode === 'clipboard_changed') messages.push('剪贴板已改变，未自动粘贴；本次文字仍保留。');
  else if (session.copied && session.errorCode) {
    if (['permission_required', 'accessibility_denied'].includes(session.errorCode)) messages.push('已复制；自动粘贴需系统授权，也可手动粘贴。');
    else if (['paste_uncertain', 'insertion_uncertain', 'native_timeout', 'native_protocol_error', 'helper_unavailable'].includes(session.errorCode)) messages.push('已复制，粘贴结果未确认，请先检查当前应用。');
    else if (['paste_failed', 'event_unavailable', 'request_expired', 'invalid_request', 'cancelled'].includes(session.errorCode)) messages.push('已复制，未能自动粘贴，可手动粘贴。');
    else messages.push('已复制，粘贴结果未确认，请先检查当前应用。');
  } else if (session.delivery === 'dispatched') messages.push(session.rawText !== session.text ? '整理后的文字已尝试自动粘贴，请检查当前应用。' : '本次听写已尝试自动粘贴，请检查当前应用。');
  else if (messages.length && session.copied) messages.push('文字已复制。');
  return messages.join(' ');
}
