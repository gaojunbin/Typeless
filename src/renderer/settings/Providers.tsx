import { useEffect, useRef, useState } from 'react';
import { Field } from '../ui';
import type { SettingsSectionProps } from './types';

type Provider = 'asr' | 'cleanup';
interface ProviderDraft { baseUrl: string; model: string; kind: 'mimo' | 'openai' }
function endpointChanged(current: string, saved: string) {
  try { return new URL(current).origin !== new URL(saved).origin; }
  catch { return current !== saved; }
}

function ProviderForm({ provider, snapshot, run }: SettingsSectionProps & { provider: Provider }) {
  const speech = provider === 'asr';
  const saved = snapshot.settings[provider];
  const savedKind = speech ? snapshot.settings.asr.kind : 'openai';
  const [draft, setDraft] = useState<ProviderDraft>({ baseUrl: saved.baseUrl, model: saved.model, kind: savedKind });
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const edited = useRef(false);
  useEffect(() => {
    if (!edited.current) setDraft({ baseUrl: saved.baseUrl, model: saved.model, kind: savedKind });
  }, [saved.baseUrl, saved.model, savedKind]);
  const cleanKey = key.trim();
  const changed = draft.baseUrl !== saved.baseUrl || draft.model !== saved.model || draft.kind !== savedKind || Boolean(cleanKey);
  const originChanged = endpointChanged(draft.baseUrl, saved.baseUrl) || draft.kind !== savedKind;
  function change(patch: Partial<ProviderDraft>) { edited.current = true; setDraft(previous => ({ ...previous, ...patch })); setError(''); }
  async function save() {
    setBusy(true); setError('');
    const settings = { baseUrl: draft.baseUrl, model: draft.model, ...(speech ? { kind: draft.kind } : {}) };
    try {
      const ok = await run({ type: 'settings.save', patch: { [provider]: settings }, ...(cleanKey ? { secrets: { [provider]: cleanKey } } : {}) });
      if (ok) { edited.current = false; setKey(''); }
      else setError('保存失败，请检查服务配置后重试。');
    } catch { setError('保存失败，请重试。'); }
    finally { setBusy(false); }
  }
  async function deleteKey() {
    setBusy(true); setError('');
    try {
      if (await run({ type: 'settings.save', patch: {}, secrets: { [provider]: '' } })) setKey('');
      else setError('删除失败，请重试。');
    } catch { setError('删除失败，请重试。'); }
    finally { setBusy(false); }
  }
  return <form className="provider-panel" onSubmit={event => { event.preventDefault(); void save(); }}>
    <h2>{speech ? '语音识别' : '文字润色'}</h2>
    <fieldset className="settings-body" disabled={busy}>
      {speech && <Field label="语音协议"><select value={draft.kind} onChange={event => change({ kind: event.target.value as ProviderDraft['kind'] })}><option value="mimo">小米 MiMo</option><option value="openai">OpenAI 兼容</option></select></Field>}
      <Field label={speech ? '语音服务地址' : '润色服务地址'}><input type="url" required value={draft.baseUrl} onChange={event => change({ baseUrl: event.target.value })} placeholder="https://api.example.com/v1" /></Field>
      <Field label={speech ? '语音模型' : '润色模型'}><input value={draft.model} onChange={event => change({ model: event.target.value })} placeholder="模型名称" /></Field>
      <Field label={speech ? '语音 API 密钥' : '润色 API 密钥'} hint={originChanged && saved.hasApiKey ? '地址或协议已变更，请重新输入密钥。' : saved.hasApiKey ? '已保存；留空保留。' : '密钥仅保存在本机，不会回显。'}><input type="password" autoComplete="new-password" value={key} onChange={event => { setKey(event.target.value); edited.current = true; setError(''); }} placeholder={saved.hasApiKey ? '输入新密钥以更新' : '输入 API 密钥'} /></Field>
      <div className="row-actions"><button className="primary" type="submit" disabled={!changed}>{busy ? '保存中…' : '保存'}</button>{saved.hasApiKey && <button className="text-button" type="button" onClick={() => { void deleteKey(); }}>删除密钥</button>}</div>
    </fieldset>
    {error && <p className="error-text" role="alert">{error}</p>}
  </form>;
}

export function Providers(props: SettingsSectionProps) {
  return <><div className="provider-grid"><ProviderForm {...props} provider="asr" /><ProviderForm {...props} provider="cleanup" /></div><p className="muted">音频发送至语音服务；开启润色后，文字发送至润色服务。</p></>;
}
