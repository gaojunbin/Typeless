import { describe, expect, it } from 'vitest';
import { idleSession } from '../src/core/session';
import { recoveryMessage, recoverySettings, warningMessage } from '../src/renderer/sessionPresentation';

describe('dictation recovery presentation', () => {
  it('keeps a numeric review warning alongside uncertain delivery instead of claiming paste failed', () => {
    const message = warningMessage({ ...idleSession(), copied: true, delivery: 'copied', errorCode: 'native_timeout', warning: 'Numbers changed during text processing. Review before insertion.' }, 'zh');
    expect(message).toContain('数字有变化');
    expect(message).toContain('粘贴结果未确认');
    expect(message).not.toContain('可手动粘贴');
    expect(message).not.toContain('未能自动粘贴');
  });

  it.each(['paste_uncertain', 'insertion_uncertain', 'native_timeout', 'native_protocol_error', 'helper_unavailable', 'native_error'])('does not encourage duplicate paste after %s', errorCode => {
    const message = warningMessage({ ...idleSession(), copied: true, delivery: 'copied', errorCode }, 'zh');
    expect(message).toContain('请先检查当前应用');
    expect(message).not.toContain('未能自动粘贴');
  });

  it('identifies the earlier automatic paste without implying that copying raw text pastes it again', () => {
    const session = { ...idleSession(), copied: true, delivery: 'dispatched' as const, rawText: '嗯，明天开会。', text: '明天开会。' };
    expect(warningMessage(session, 'zh')).toBe('整理后的文字已尝试自动粘贴，请检查当前应用。');
    expect(warningMessage({ ...session, rawText: session.text }, 'zh')).toBe('本次听写已尝试自动粘贴，请检查当前应用。');
  });

  it('does not claim the clipboard still holds output after another app changed it', () => {
    const message = warningMessage({ ...idleSession(), copied: true, errorCode: 'clipboard_changed' }, 'zh');
    expect(message).toContain('剪贴板已改变');
    expect(message).not.toContain('可手动粘贴');
  });

  it('keeps polishing failure visible even when copying succeeded', () => {
    const session = { ...idleSession(), copied: true, warning: 'Text processing failed. Original transcript is ready.' };
    expect(recoveryMessage(session, 'zh')).toContain('润色未完成');
    expect(recoveryMessage(session, 'zh')).toContain('识别原文');
  });

  it('separates rate limiting from payment errors and routes configuration failures', () => {
    expect(recoveryMessage({ ...idleSession(), errorCode: 'asr_429' }, 'zh')).toContain('请求过多');
    expect(recoveryMessage({ ...idleSession(), errorCode: 'asr_429' }, 'zh')).not.toMatch(/余额|额度/);
    expect(recoveryMessage({ ...idleSession(), errorCode: 'asr_402' }, 'zh')).toContain('余额不足');
    for (const errorCode of ['asr_400', 'asr_402', 'asr_413', 'asr_421']) expect(recoverySettings({ ...idleSession(), errorCode })).toBe('ai');
  });

  it('offers nearby microphone settings without exposing internal error text or a circular instruction', () => {
    const session = { ...idleSession(), errorCode: 'no_speech', error: 'Synthetic internal capture failure' };
    expect(recoveryMessage(session, 'zh')).toContain('未检测到声音');
    expect(recoveryMessage(session, 'zh')).not.toMatch(/Synthetic|打开 Typeless/);
    expect(recoverySettings(session)).toBe('basic');
  });

  it('renders the same decisions in English without any Chinese text', () => {
    const cjk = /[一-鿿]/;
    const uncertain = warningMessage({ ...idleSession(), copied: true, delivery: 'copied', errorCode: 'native_timeout', warning: 'Numbers changed during text processing. Review before insertion.' }, 'en');
    expect(uncertain).toContain('Numbers changed');
    expect(uncertain).toContain('check the current app');
    expect(uncertain).not.toMatch(cjk);
    expect(recoveryMessage({ ...idleSession(), errorCode: 'asr_429' }, 'en')).toContain('Too many requests');
    expect(recoveryMessage({ ...idleSession(), errorCode: 'asr_503' }, 'en')).toContain('temporarily unavailable');
    expect(recoveryMessage({ ...idleSession(), errorCode: 'no_speech', error: 'Synthetic' }, 'en')).not.toMatch(cjk);
  });
});
