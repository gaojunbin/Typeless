import type { AppSettings, DictationMode, DictionaryEntry, MemoryEntry, AppProfile } from '../shared/contracts';
import { endpointBase } from './store';
import { cleanupMessages } from './cleanup-prompt';
export { cleanupMessages } from './cleanup-prompt';
export type Fetcher = typeof fetch;
export class ProviderError extends Error { constructor(message: string, public code = 'provider') { super(message); } }
export function endpoint(base: string, suffix: string) {
  const url = endpointBase(base);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/${suffix}`;
  return url.toString();
}
const errorText = (status: number) => ({ 400: 'The provider rejected the request format or model.', 401: 'The API key was rejected.', 402: 'The provider account has insufficient balance.', 403: 'The provider denied access.', 404: 'The provider endpoint or model was not found.', 413: 'The audio is too large.', 421: 'The provider blocked this content.', 429: 'The provider rate limit was reached.', 500: 'The provider encountered an internal error.', 503: 'The provider is temporarily unavailable.' }[status] || `The provider returned HTTP ${status}.`);
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    const done = () => { signal.removeEventListener('abort', cancel); resolve(); };
    const timer = setTimeout(done, ms);
    const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(new DOMException('Cancelled', 'AbortError')); };
    signal.addEventListener('abort', cancel, { once: true });
  });
}
async function readJSON(response: Response, signal: AbortSignal): Promise<any> {
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError('The provider returned an empty response.');
  const decoder = new TextDecoder(); let text = ''; let bytes = 0;
  while (true) {
    if (signal.aborted) { await reader.cancel(); throw new DOMException('Cancelled', 'AbortError'); }
    const { done, value } = await reader.read(); if (done) break;
    bytes += value.byteLength;
    if (bytes > 1000000) { await reader.cancel(); throw new ProviderError('The provider response exceeded the size limit.'); }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try { return JSON.parse(text); } catch { throw new ProviderError('The provider returned invalid JSON.'); }
}
export class Providers {
  constructor(private fetcher: Fetcher = fetch) {}
  private async request(url: string, init: RequestInit, parent: AbortSignal, retry = false) {
    const controller = new AbortController();
    const cancel = () => controller.abort(); parent.addEventListener('abort', cancel, { once: true });
    if (parent.aborted) controller.abort();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      for (let attempt = 0; ; attempt++) {
        const response = await this.fetcher(url, { ...init, redirect: 'error', signal: controller.signal });
        if (retry && [429, 503].includes(response.status) && attempt < 2) {
          const header = response.headers.get('retry-after');
          const seconds = header ? Number(header) : NaN;
          const wait = Number.isFinite(seconds) ? seconds * 1000 : header ? Date.parse(header) - Date.now() : 500 * 2 ** attempt;
          await response.body?.cancel();
          if (wait > 5000) throw new ProviderError(errorText(response.status), String(response.status));
          await delay(Math.max(100, wait || 500) + Math.random() * 100, controller.signal); continue;
        }
        if (!response.ok) { await response.body?.cancel(); throw new ProviderError(errorText(response.status), String(response.status)); }
        return await readJSON(response, controller.signal);
      }
    } catch (error) {
      if (parent.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (controller.signal.aborted) throw new ProviderError('The request timed out. It may have been processed; retrying may incur another charge.', 'timeout');
      if (error instanceof ProviderError) throw error;
      throw new ProviderError('The provider could not be reached. Check the endpoint and network. Redirects are not followed.', 'network');
    } finally { clearTimeout(timeout); parent.removeEventListener('abort', cancel); }
  }
  async transcribe(settings: AppSettings['asr'], key: string, wav: Uint8Array, language: string, signal: AbortSignal) {
    if (!key || !settings.model.trim()) throw new ProviderError('Configure the speech provider model and API key first.', 'configuration');
    if (wav.byteLength < 44 || wav.byteLength > 6750000 || Buffer.from(wav.subarray(0, 4)).toString() !== 'RIFF' || Buffer.from(wav.subarray(8, 12)).toString() !== 'WAVE') throw new ProviderError('Expected a valid WAV recording under the upload limit.', 'audio');
    if (settings.kind === 'mimo') {
      const data = await this.request(endpoint(settings.baseUrl, 'chat/completions'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': key },
        body: JSON.stringify({ model: settings.model, messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: `data:audio/wav;base64,${Buffer.from(wav).toString('base64')}` } }] }], asr_options: { language: ['zh', 'en'].includes(language) ? language : 'auto' }, stream: false }),
      }, signal, true);
      return completionText(data);
    }
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'dictation.wav');
    form.append('model', settings.model); form.append('response_format', 'json');
    if (language !== 'auto' && /^[a-z]{2}$/.test(language)) form.append('language', language);
    const data = await this.request(endpoint(settings.baseUrl, 'audio/transcriptions'), { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form }, signal, true);
    if (typeof data.text !== 'string' || data.text.length > 50000) throw new ProviderError('The speech provider returned an invalid transcript.');
    if (!data.text.trim()) throw new ProviderError('No speech was recognized.');
    return data.text.trim();
  }
  async cleanup(settings: AppSettings, key: string, transcript: string, mode: DictationMode, context: { targetApp: string; dictionary: DictionaryEntry[]; memories: MemoryEntry[]; profiles: AppProfile[] }, signal: AbortSignal) {
    if (!settings.cleanup.enabled && mode === 'dictate') return { text: transcript, warning: undefined };
    if (!key || !settings.cleanup.model.trim()) return { text: transcript, warning: mode === 'translate' ? 'Translation is unavailable. Configure the translation model and API key; this is the original transcript.' : 'Text cleanup is not configured. Original transcript is ready.' };
    const messages = cleanupMessages(settings, transcript, mode, context);
    const data = await this.request(endpoint(settings.cleanup.baseUrl, 'chat/completions'), { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: settings.cleanup.model, messages, stream: false }) }, signal, true);
    const text = completionText(data);
    const warning = semanticWarning(transcript, text, mode);
    return { text, warning };
  }
  async test(base: string, model: string, key: string, kind: 'mimo' | 'openai', signal: AbortSignal) {
    if (!key) throw new ProviderError('Enter an API key before testing.');
    const data = await this.request(endpoint(base, 'models'), { headers: kind === 'mimo' ? { 'api-key': key } : { Authorization: `Bearer ${key}` } }, signal);
    if (!Array.isArray(data.data)) throw new ProviderError('The endpoint did not return a compatible model list. Inference remains unverified.');
    const listed = data.data.some((x: any) => x?.id === model);
    return listed ? 'Connected; the configured model is listed. This does not validate transcription or cleanup quality.' : 'Connected to the model-list endpoint. The configured model was not listed; inference access is unverified.';
  }
}
export function completionText(data: any) {
  const choice = data?.choices?.find((x: any) => x?.index === 0) ?? data?.choices?.[0];
  if (choice?.finish_reason !== 'stop') throw new ProviderError(choice?.finish_reason === 'length' ? 'The provider output was truncated.' : 'The provider did not return a complete result.');
  if (choice.message?.refusal || choice.message?.tool_calls?.length) throw new ProviderError('The provider returned a refusal or tool call instead of text.');
  const text = choice.message?.content;
  if (typeof text !== 'string' || !text.trim() || text.length > 50000) throw new ProviderError('The provider returned empty or invalid text.');
  return text.trim();
}
function semanticWarning(raw: string, text: string, mode: DictationMode) {
  if (/^```/.test(text)) return 'The text provider returned formatting wrappers. Review before insertion.';
  const numbers = (value: string) => [...value.matchAll(/\d+(?:[.,]\d+)*/g)].map(x => x[0]).sort().join('|');
  if (numbers(raw) !== numbers(text)) return 'Numbers changed during text processing. Review before insertion.';
  if (mode === 'dictate' && text.length > raw.length * 2 + 40) return 'Text processing substantially expanded the transcript. Review before insertion.';
  return undefined;
}
