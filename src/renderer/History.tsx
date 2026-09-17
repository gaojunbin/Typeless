import { useState } from 'react';
import { Copy, Download, Pencil, RotateCcw, Search, Trash2 } from 'lucide-react';
import type { AppSnapshot, HistoryEntry } from '../shared/contracts';
import type { RunAction } from './Settings';
import { Dialog } from './Dialog';
import { Empty, Field, Toggle } from './ui';

export function History({ snapshot, run }: { snapshot: AppSnapshot; run: RunAction }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<HistoryEntry | null>(null);
  const [remember, setRemember] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const { historyEnabled, retentionDays } = snapshot.settings.privacy;
  const entries = snapshot.history.filter(entry => `${entry.rawText} ${entry.text} ${entry.targetApp}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className="page-heading"><div><h1>历史记录</h1><p>{historyEnabled ? `文字保存在本机，${retentionDays} 天后自动清理。` : '历史记录已关闭，新的口述不会保存到这里。'}</p></div></div>
    {!historyEnabled && <div className="inline-notice"><button onClick={() => { void run({ type: 'settings.save', patch: { privacy: { historyEnabled: true } } }); }}>开启历史记录</button></div>}
    <div className="toolbar"><div className="search"><Search size={17} /><input aria-label="搜索历史" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索文字或应用" /></div>
      {snapshot.history.length > 0 && <details className="action-menu"><summary>更多</summary><button onClick={() => { void run({ type: 'history.export' }); }}><Download size={15} />导出历史</button><button className="danger-quiet" onClick={() => setConfirmClear(true)}><Trash2 size={15} />清空历史</button></details>}
    </div>
    {!entries.length ? <Empty title={query.trim() ? '没有匹配的记录' : '暂无记录'} text={query.trim() ? '试试其他关键词。' : historyEnabled ? '完成口述后，可在这里回看和复制文字。' : '开启历史记录后，新的口述文字会保存在这里。'} /> : <div className="history-list">{entries.map(entry => <article className="history-card" key={entry.id}>
      <div className="history-meta"><span>{new Date(entry.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>{entry.targetApp && <span>{entry.targetApp}</span>}{entry.mode === 'translate' && <span>翻译</span>}</div>
      <p className="history-text">{entry.text || entry.rawText}</p>
      {entry.warning && <p className="warning-text">{entry.warning}</p>}
      <div className="history-actions"><button onClick={() => { void run({ type: 'dictation.copy', text: entry.text || entry.rawText }); }}><Copy size={15} />复制</button>
        <details className="history-details"><summary>更多</summary>
          <div className="history-meta"><span>{entry.inserted ? '已发起粘贴' : '未自动粘贴'}</span></div>
          <details><summary>识别原文</summary><p className="raw-text">{entry.rawText || '无识别原文'}</p></details>
          <div className="row-actions"><button onClick={() => { void run({ type: 'history.reprocess', id: entry.id }); }}><RotateCcw size={15} />重新整理</button><button onClick={() => { setEditing({ ...entry, text: entry.text || entry.rawText }); setRemember(false); }}><Pencil size={15} />修正</button><button className="danger-quiet" onClick={() => { void run({ type: 'history.delete', id: entry.id }); }}><Trash2 size={15} />删除记录</button></div>
        </details>
      </div>
    </article>)}</div>}
    {editing && <Dialog title="修正文字" onClose={() => setEditing(null)}>
      <Field label="修正结果"><textarea className="tall" value={editing.text} onChange={event => setEditing({ ...editing, text: event.target.value })} /></Field>
      {snapshot.settings.privacy.memoryEnabled ? <Toggle label="将此次修正保存为个人记忆" hint="仅在勾选后保存，可在个性化中查看或删除。" checked={remember} onChange={setRemember} /> : <p className="muted">如需保存为记忆，请先在个性化 → 记忆中开启个人记忆。</p>}
      <div className="modal-footer"><button onClick={() => setEditing(null)}>取消</button><button className="primary" disabled={!editing.text.trim()} onClick={async () => { if (await run({ type: 'history.correct', id: editing.id, text: editing.text, remember: remember && snapshot.settings.privacy.memoryEnabled })) setEditing(null); }}>保存修正</button></div>
    </Dialog>}
    {confirmClear && <Dialog title="清空所有历史记录？" onClose={() => setConfirmClear(false)}><p>此操作无法撤销。词典和个人记忆不受影响。</p><div className="modal-footer"><button onClick={() => setConfirmClear(false)}>取消</button><button className="danger" onClick={async () => { if (await run({ type: 'history.clear' })) setConfirmClear(false); }}>清空历史</button></div></Dialog>}
  </>;
}
