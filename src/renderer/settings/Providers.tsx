import '../styles/providers.css';
import { useEffect, useRef, useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import { PageHeader, SectionGroup, SettingRow } from '../ui';
import type { SettingsSectionProps } from './types';

type Provider = 'asr' | 'cleanup';
interface ProviderDraft { baseUrl: string; model: string; kind: 'mimo' | 'openai' }
const protocols = [
  { value: 'mimo', title: '小米 MiMo', description: '音频以 Base64 发送到 chat/completions' },
  { value: 'openai', title: 'OpenAI 兼容', description: 'multipart 上传到 audio/transcriptions' },
] as const;

// Pages unmount when the sidebar switches, so unsaved provider edits are kept here and restored on return.
const retainedDrafts: Partial<Record<Provider, { draft: ProviderDraft; key: string }>> = {};

function endpointChanged(current: string, saved: string) {
  try { return new URL(current).origin !== new URL(saved).origin; }
  catch { return current !== saved; }
}

function ProviderForm({ provider, snapshot, run }: SettingsSectionProps & { provider: Provider }) {
  const speech = provider === 'asr';
  const saved = snapshot.settings[provider];
  const savedKind = speech ? snapshot.settings.asr.kind : 'openai';
  const retained = retainedDrafts[provider];
  const [draft, setDraft] = useState<ProviderDraft>(retained?.draft ?? { baseUrl: saved.baseUrl, model: saved.model, kind: savedKind });
  const [key, setKey] = useState(retained?.key ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const edited = useRef(Boolean(retained));
  useEffect(() => {
    if (!edited.current) setDraft({ baseUrl: saved.baseUrl, model: saved.model, kind: savedKind });
  }, [saved.baseUrl, saved.model, savedKind]);
  useEffect(() => {
    if (edited.current) retainedDrafts[provider] = { draft, key };
    else delete retainedDrafts[provider];
  }, [provider, draft, key]);
  const cleanKey = key.trim();
  const changed = draft.baseUrl !== saved.baseUrl || draft.model !== saved.model || draft.kind !== savedKind || Boolean(cleanKey);
  const originChanged = endpointChanged(draft.baseUrl, saved.baseUrl) || draft.kind !== savedKind;
  function change(patch: Partial<ProviderDraft>) { edited.current = true; setDraft(previous => ({ ...previous, ...patch })); setError(''); }
  async function save() {
    setBusy(true); setError('');
    const settings = { baseUrl: draft.baseUrl, model: draft.model, ...(speech ? { kind: draft.kind } : {}) };
    try {
      const ok = await run({ type: 'settings.save', patch: { [provider]: settings }, ...(cleanKey ? { secrets: { [provider]: cleanKey } } : {}) });
      if (ok) { edited.current = false; delete retainedDrafts[provider]; setKey(''); }
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
  const keyHint = originChanged && saved.hasApiKey ? '地址或协议已变更，请重新输入密钥。'
    : saved.hasApiKey ? '已保存；留空保留。' : '密钥仅保存在本机，不会回显。';
  return <form className="provider-panel" onSubmit={event => { event.preventDefault(); void save(); }}>
    <SectionGroup icon={speech ? <Mic size={20} strokeWidth={1.5} /> : <Sparkles size={20} strokeWidth={1.5} />} title={speech ? '语音识别' : '文字润色'}>
      <fieldset disabled={busy}>
        {speech && <SettingRow
          stacked
          label="语音协议"
          control={<div className="option-cards" role="radiogroup" aria-label="语音协议">
            {protocols.map(option => <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={draft.kind === option.value}
              className="option-card"
              onClick={() => change({ kind: option.value })}
            ><strong>{option.title}</strong><span>{option.description}</span></button>)}
          </div>}
        />}
        <SettingRow
          label={speech ? '语音服务地址' : '润色服务地址'}
          htmlFor={`${provider}-base-url`}
          description="填写服务根地址，不要包含 /chat/completions。"
          control={<input id={`${provider}-base-url`} type="url" required value={draft.baseUrl} onChange={event => change({ baseUrl: event.target.value })} placeholder="https://api.example.com/v1" />}
        />
        <SettingRow
          label={speech ? '语音模型' : '润色模型'}
          htmlFor={`${provider}-model`}
          control={<input id={`${provider}-model`} value={draft.model} onChange={event => change({ model: event.target.value })} placeholder="模型名称" />}
        />
        <SettingRow
          label={speech ? '语音 API 密钥' : '润色 API 密钥'}
          htmlFor={`${provider}-key`}
          control={<input id={`${provider}-key`} type="password" autoComplete="new-password" value={key} onChange={event => { setKey(event.target.value); edited.current = true; setError(''); }} placeholder={saved.hasApiKey ? '输入新密钥以更新' : '输入 API 密钥'} />}
          status={keyHint}
        />
        <div className="row-actions">
          {saved.hasApiKey && <button className="text-button danger-text" type="button" onClick={() => { void deleteKey(); }}>删除密钥</button>}
          <button className="primary" type="submit" disabled={!changed}>{busy ? '保存中…' : '保存'}</button>
        </div>
      </fieldset>
      {error && <p className="error-text" role="alert">{error}</p>}
    </SectionGroup>
  </form>;
}

export function Providers(props: SettingsSectionProps) {
  return <>
    <PageHeader title="AI 配置" subtitle="语音识别与文字润色分别连接你自己的模型服务，密钥只保存在本机。" />
    <ProviderForm {...props} provider="asr" />
    <ProviderForm {...props} provider="cleanup" />
    <p className="providers-footnote">音频发送至语音服务；开启润色后，文字发送至润色服务。</p>
  </>;
}
