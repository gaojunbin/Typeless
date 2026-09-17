import type { DictationSession } from '../shared/contracts';

const recoveryMessages: Record<string, string> = {
  provider_not_configured: '请先在设置中配置模型和密钥',
  microphone_denied: '请在系统设置中允许麦克风',
  clipboard_copy_failed: '自动复制失败，可在这里重新复制',
  cancelled: '操作已取消',
};

export function recoveryMessage(session: DictationSession): string {
  if (session.copied) {
    if (session.warning?.includes('Text cleanup is not configured.')) return '文字模型未配置，识别原文已复制。';
    if (session.warning?.includes('Translation is unavailable.')) return '翻译模型未配置，识别原文已复制。';
    if (session.warning?.includes('Text processing failed.')) return '文字整理未完成，识别原文已复制。';
    return '已复制，可直接粘贴';
  }
  if (session.errorCode && recoveryMessages[session.errorCode]) return recoveryMessages[session.errorCode];
  if (session.error) {
    if (/API key|Configure.*provider|model.*required/i.test(session.error)) return '请先在设置中配置模型和密钥';
    if (/microphone|audio device|NotAllowedError/i.test(session.error)) return '请检查麦克风与录音权限';
    return '处理未完成，请打开 Typeless 查看';
  }
  return '文字已保留，可在这里复制';
}

export function deliveryMessage(session: DictationSession): string {
  switch (session.delivery) {
    case 'pending': return '文字已就绪，正在复制与粘贴。';
    case 'copied': return '已复制，可直接粘贴。';
    case 'confirmed': return '已复制，目标应用已确认粘贴。';
    case 'dispatched': return '已复制并发起粘贴，请检查当前应用。';
    case 'failed': return '未能自动复制，文字保留在这里。';
    default: return session.copied ? '已复制，可直接粘贴。' : '文字已就绪，保留在这里。';
  }
}
