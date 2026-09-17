import { Field } from '../ui';
import type { RunAction, SettingsSectionProps } from './types';

type Provider = 'asr' | 'cleanup';
interface ProvidersProps extends SettingsSectionProps {
  keys: Record<Provider, string>;
  changeKey: (provider: Provider, value: string) => void;
  deleteKey: (provider: Provider) => Promise<void>;
  run: RunAction;
  dirty: boolean;
}

function endpointChanged(current: string, saved: string) {
  try { return new URL(current).origin !== new URL(saved).origin; }
  catch { return current !== saved; }
}

export function Providers({ form, snapshot, change, keys, changeKey, deleteKey, run, dirty }: ProvidersProps) {
  return <>
    {(['asr', 'cleanup'] as const).map(provider => {
      const speech = provider === 'asr';
      const saved = snapshot.settings[provider];
      const settings = form[provider];
      const changed = endpointChanged(settings.baseUrl, saved.baseUrl) || (speech && form.asr.kind !== snapshot.settings.asr.kind);
      return <section className="settings-group" key={provider}>
        <h2>{speech ? '语音识别' : '文字整理'}</h2>
        <p className="muted">{speech ? form.asr.kind === 'mimo' ? '小米 MiMo' : 'OpenAI 兼容转写' : '用于润色与翻译；润色程度在「文字整理」中选择。'}</p>
        {!speech && <Field label="模型"><input value={settings.model} onChange={event => change(provider, { model: event.target.value })} placeholder="服务商提供的模型名称" /></Field>}
        <Field label="API 密钥" hint={changed && saved.hasApiKey ? '服务地址或协议已更改，请重新输入密钥。' : saved.hasApiKey ? '已保存；留空保留原密钥。' : '尚未配置；密钥不会回显。'}><input type="password" autoComplete="new-password" value={keys[provider]} onChange={event => changeKey(provider, event.target.value)} placeholder={saved.hasApiKey ? '输入新密钥以更新' : '输入 API 密钥'} /></Field>
        <div className="provider-actions row-actions"><button disabled={dirty} onClick={() => { void run({ type: 'provider.test', provider }); }}>测试连接</button>{saved.hasApiKey && <button className="text-button danger-quiet" onClick={() => { void deleteKey(provider); }}>删除已保存密钥</button>}</div>
        <details className="settings-details"><summary>{speech ? '语音服务设置' : '文字服务地址'}</summary>
          {speech && <Field label="服务协议"><select value={form.asr.kind} onChange={event => change('asr', { kind: event.target.value as 'mimo' | 'openai' })}><option value="mimo">小米 MiMo</option><option value="openai">OpenAI 兼容转写</option></select></Field>}
          <Field label={speech ? '服务地址' : '服务地址 · OpenAI 兼容'}><input type="url" value={settings.baseUrl} onChange={event => change(provider, { baseUrl: event.target.value })} placeholder="https://api.example.com/v1" /></Field>
          {speech && <Field label="模型"><input value={settings.model} onChange={event => change(provider, { model: event.target.value })} placeholder="服务商提供的模型名称" /></Field>}
        </details>
      </section>;
    })}
    {dirty && <p className="muted">保存设置后可测试连接。</p>}
    <details className="settings-details"><summary>数据与服务说明</summary><p className="muted">音频发送至语音服务，需要润色或翻译时，文字发送至文字服务。两项服务分别配置密钥；服务商的数据政策独立适用。</p></details>
  </>;
}
