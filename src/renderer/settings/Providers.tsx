import '../styles/providers.css';
import { useEffect, useRef, useState } from 'react';
import { Mic, PenLine } from 'lucide-react';
import { PageHeader, SectionGroup, SettingRow } from '../ui';
import { useI18n, type MessageKey } from '../i18n';
import type { SettingsSectionProps } from './types';
import { WritingInstructionsRow, WritingLevelRow } from './Writing';

type Provider = 'asr' | 'cleanup';
interface ProviderDraft { baseUrl: string; model: string; kind: 'mimo' | 'openai' }
const protocols: readonly { value: 'mimo' | 'openai'; titleKey: MessageKey; descriptionKey: MessageKey }[] = [
  { value: 'mimo', titleKey: 'common.protocol.mimo', descriptionKey: 'settings.providers.protocol.mimo.description' },
  { value: 'openai', titleKey: 'common.protocol.openai', descriptionKey: 'settings.providers.protocol.openai.description' },
];

// Pages unmount when the sidebar switches, so unsaved provider edits are kept here and restored on return.
const retainedDrafts: Partial<Record<Provider, { draft: ProviderDraft; key: string }>> = {};

function endpointChanged(current: string, saved: string) {
  try { return new URL(current).origin !== new URL(saved).origin; }
  catch { return current !== saved; }
}

function ProviderForm({ provider, snapshot, run }: SettingsSectionProps & { provider: Provider }) {
  const { t } = useI18n();
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
      else setError(t('settings.providers.saveRejected'));
    } catch { setError(t('settings.providers.saveFailed')); }
    finally { setBusy(false); }
  }
  async function deleteKey() {
    setBusy(true); setError('');
    try {
      if (await run({ type: 'settings.save', patch: {}, secrets: { [provider]: '' } })) setKey('');
      else setError(t('settings.providers.removeFailed'));
    } catch { setError(t('settings.providers.removeFailed')); }
    finally { setBusy(false); }
  }
  const keyHint = t(originChanged && saved.hasApiKey ? 'settings.providers.key.hint.reenter'
    : saved.hasApiKey ? 'settings.providers.key.hint.stored' : 'settings.providers.key.hint.local');
  return <form className="provider-panel" onSubmit={event => { event.preventDefault(); void save(); }}>
    <SectionGroup icon={speech ? <Mic size={20} strokeWidth={1.5} /> : <PenLine size={20} strokeWidth={1.5} />} title={t(speech ? 'settings.providers.asr.title' : 'settings.providers.cleanup.title')}>
      {!speech && <><WritingLevelRow snapshot={snapshot} run={run} /><div className="provider-divider" /></>}
      <fieldset disabled={busy}>
        {speech && <SettingRow
          stacked
          label={t('settings.providers.protocol.label')}
          control={<div className="option-cards" role="radiogroup" aria-label={t('settings.providers.protocol.label')}>
            {protocols.map(option => <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={draft.kind === option.value}
              className="option-card"
              onClick={() => change({ kind: option.value })}
            ><strong>{t(option.titleKey)}</strong><span>{t(option.descriptionKey)}</span></button>)}
          </div>}
        />}
        <SettingRow
          label={t(speech ? 'settings.providers.asr.endpoint' : 'settings.providers.cleanup.endpoint')}
          htmlFor={`${provider}-base-url`}
          description={t('settings.providers.endpoint.description')}
          control={<input id={`${provider}-base-url`} type="url" required value={draft.baseUrl} onChange={event => change({ baseUrl: event.target.value })} placeholder="https://api.example.com/v1" />}
        />
        <SettingRow
          label={t(speech ? 'settings.providers.asr.model' : 'settings.providers.cleanup.model')}
          htmlFor={`${provider}-model`}
          control={<input id={`${provider}-model`} value={draft.model} onChange={event => change({ model: event.target.value })} placeholder={t('settings.providers.model.placeholder')} />}
        />
        <SettingRow
          label={t(speech ? 'settings.providers.asr.key' : 'settings.providers.cleanup.key')}
          htmlFor={`${provider}-key`}
          control={<input id={`${provider}-key`} type="password" autoComplete="new-password" value={key} onChange={event => { setKey(event.target.value); edited.current = true; setError(''); }} placeholder={t(saved.hasApiKey ? 'settings.providers.key.placeholder.replace' : 'settings.providers.key.placeholder.new')} />}
          status={keyHint}
        />
        <div className="row-actions">
          {saved.hasApiKey && <button className="text-button danger-text" type="button" onClick={() => { void deleteKey(); }}>{t('settings.providers.removeKey')}</button>}
          <button className="primary" type="submit" disabled={!changed}>{t(busy ? 'settings.providers.saving' : 'settings.providers.save')}</button>
        </div>
      </fieldset>
      {error && <p className="error-text" role="alert">{error}</p>}
      {!speech && <><div className="provider-divider" /><WritingInstructionsRow snapshot={snapshot} run={run} /></>}
    </SectionGroup>
  </form>;
}

export function Providers(props: SettingsSectionProps) {
  const { t } = useI18n();
  return <>
    <PageHeader title={t('common.page.ai')} subtitle={t('settings.providers.subtitle')} />
    <ProviderForm {...props} provider="asr" />
    <ProviderForm {...props} provider="cleanup" />
    <p className="providers-footnote">{t('settings.providers.footnote')}</p>
  </>;
}
