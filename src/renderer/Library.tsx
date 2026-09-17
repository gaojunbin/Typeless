import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, Search } from 'lucide-react';
import type { AppSnapshot, DictionaryEntry, MemoryEntry, AppProfile } from '../shared/contracts';
import type { RunAction } from './Settings';
import { Empty, Field, Toggle } from './ui';
import { Dialog } from './Dialog';
export { History } from './History';

export type LibraryPage = 'dictionary' | 'memory' | 'profiles';
type Entry = DictionaryEntry | MemoryEntry | AppProfile;
const titles = { dictionary: '词典', memory: '记忆', profiles: '应用风格' };
const descriptions = { dictionary: '添加常用词、名字或术语。', memory: '添加希望文字整理遵循的偏好。', profiles: '为指定应用设置表达方式。' };
function entryTitle(entry: Entry) { return 'term' in entry ? entry.term : 'content' in entry ? entry.content : entry.appName; }
function searchText(entry: Entry) {
  return 'term' in entry ? `${entry.term} ${entry.replacement} ${entry.description} ${entry.scope}` : 'content' in entry ? `${entry.content} ${entry.scope}` : `${entry.appName} ${entry.instructions}`;
}

export function Library({ page, snapshot, run }: { page: LibraryPage; snapshot: AppSnapshot; run: RunAction }) {
  const [editing, setEditing] = useState<Entry | null>(null);
  const [query, setQuery] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setQuery(''); setEditing(null); }, [page]);
  const entries = page === 'dictionary' ? snapshot.dictionary : page === 'memory' ? snapshot.memories : snapshot.profiles;
  const filtered = entries.filter(entry => searchText(entry).toLowerCase().includes(query.trim().toLowerCase()));
  function add() {
    const id = crypto.randomUUID();
    setEditing(page === 'dictionary' ? { id, term: '', replacement: '', description: '', scope: '' } : page === 'memory' ? { id, content: '', scope: '', enabled: true, source: 'manual', createdAt: new Date().toISOString() } : { id, appName: '', instructions: '', enabled: true });
  }
  async function save() {
    if (!editing) return;
    let saved = false;
    if ('term' in editing) { if (!editing.term.trim()) return; saved = await run({ type: 'dictionary.save', entry: editing }); }
    else if ('content' in editing) { if (!editing.content.trim()) return; saved = await run({ type: 'memory.save', entry: editing }); }
    else { if (!editing.appName.trim() || !editing.instructions.trim()) return; saved = await run({ type: 'profile.save', profile: editing }); }
    if (saved) setEditing(null);
  }
  const valid = editing && ('term' in editing ? editing.term.trim() : 'content' in editing ? editing.content.trim() : editing.appName.trim() && editing.instructions.trim());
  return <>
    <div className="page-heading"><div><h1>{titles[page]}</h1></div><button className="primary" onClick={add}><Plus size={17} />{page === 'profiles' ? '添加应用' : '添加'}</button></div>
    {page === 'memory' && <Toggle label="使用个人记忆" hint="开启后，文字整理会参考已启用的记忆。" checked={snapshot.settings.privacy.memoryEnabled} onChange={memoryEnabled => { void run({ type: 'settings.save', patch: { privacy: { memoryEnabled } } }); }} />}
    <div className="toolbar">
      <div className="search"><Search size={17} /><input aria-label="搜索条目" value={query} onChange={event => setQuery(event.target.value)} placeholder={`搜索${titles[page]}`} /></div>
      {page === 'dictionary' && <><details className="action-menu"><summary>更多</summary><button onClick={() => fileRef.current?.click()}><Upload size={15} />导入 CSV</button><button onClick={() => { void run({ type: 'dictionary.export' }); }}><Download size={15} />导出 CSV</button></details><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={async event => { const input = event.currentTarget; const file = input.files?.[0]; if (file) await run({ type: 'dictionary.import', csv: await file.text() }); input.value = ''; }} /></>}
    </div>
    {!filtered.length ? <Empty title={query.trim() ? '没有匹配的条目' : `暂无${titles[page]}`} text={query.trim() ? '试试其他关键词。' : descriptions[page]} /> : <div className="entry-list">{filtered.map(entry => <article className="entry-card" key={entry.id}>
      <div className="entry-content"><h3>{entryTitle(entry)}</h3>
        {'term' in entry && (entry.replacement || entry.description) && <p>{entry.replacement && <>→ {entry.replacement}{entry.description && ' · '}</>}{entry.description}</p>}
        {'instructions' in entry && <p>{entry.instructions}</p>}
        <div className="history-meta">{'scope' in entry && <span>{entry.scope || '所有应用'}</span>}{'content' in entry && entry.source !== 'manual' && <span>来自已确认的修正</span>}{'enabled' in entry && !entry.enabled && <span>已停用</span>}</div>
      </div>
      <div className="row-actions">{'enabled' in entry && <button onClick={() => { void run('content' in entry ? { type: 'memory.save', entry: { ...entry, enabled: !entry.enabled } } : { type: 'profile.save', profile: { ...entry, enabled: !entry.enabled } }); }}>{entry.enabled ? '停用' : '启用'}</button>}<button aria-label={`编辑 ${entryTitle(entry)}`} title="编辑" onClick={() => setEditing({ ...entry })}><Pencil size={15} /></button><button aria-label={`删除 ${entryTitle(entry)}`} title="删除" className="danger-quiet" onClick={() => { void run({ type: page === 'dictionary' ? 'dictionary.delete' : page === 'memory' ? 'memory.delete' : 'profile.delete', id: entry.id }); }}><Trash2 size={15} /></button></div>
    </article>)}</div>}
    {editing && <Dialog title={`${entries.some(entry => entry.id === editing.id) ? '编辑' : '添加'}${titles[page]}`} onClose={() => setEditing(null)}>
      {'term' in editing ? <><Field label="词语或短语"><input value={editing.term} onChange={event => setEditing({ ...editing, term: event.target.value })} /></Field><Field label="期望输出（可选）"><input value={editing.replacement} onChange={event => setEditing({ ...editing, replacement: event.target.value })} /></Field><Field label="说明（可选）"><input value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} /></Field></> : 'content' in editing ? <Field label="记忆内容"><textarea value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} placeholder="例如：保留英文产品名" /></Field> : <><Field label="应用名称"><input value={editing.appName} onChange={event => setEditing({ ...editing, appName: event.target.value })} placeholder="例如 Mail、Slack" /></Field><Field label="表达方式"><textarea value={editing.instructions} onChange={event => setEditing({ ...editing, instructions: event.target.value })} /></Field></>}
      {'scope' in editing && <Field label="适用应用" hint="留空表示所有应用。"><input value={editing.scope} onChange={event => setEditing({ ...editing, scope: event.target.value })} /></Field>}
      {'enabled' in editing && <Toggle label="启用此条目" checked={editing.enabled} onChange={enabled => setEditing({ ...editing, enabled })} />}
      <div className="modal-footer"><button onClick={() => setEditing(null)}>取消</button><button className="primary" disabled={!valid} onClick={() => { void save(); }}>保存</button></div>
    </Dialog>}
  </>;
}
