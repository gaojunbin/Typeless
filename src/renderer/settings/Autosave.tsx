import { useEffect, useRef, useState } from 'react';

export function useSettingDraft<T>(saved: T, save: (value: T) => Promise<boolean>) {
  const [value, setValue] = useState(saved);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const current = useRef(saved);
  const persisted = useRef(saved);
  const dirty = useRef(false);
  const saveRef = useRef(save);
  const queue = useRef(Promise.resolve(true));
  const pending = useRef<{ id: number; value: T } | undefined>(undefined);
  const sequence = useRef(0);
  saveRef.current = save;
  useEffect(() => {
    persisted.current = saved;
    if (!dirty.current) { current.current = saved; setValue(saved); }
  }, [saved]);
  function edit(next: T) { current.current = next; dirty.current = next !== persisted.current || pending.current !== undefined; setValue(next); }
  function commit(next = current.current) {
    if (pending.current?.value === next) return queue.current;
    if (pending.current === undefined && next === persisted.current && status !== 'error') return Promise.resolve(true);
    const id = ++sequence.current;
    pending.current = { id, value: next };
    setStatus('saving');
    const operation = queue.current.then(async () => {
      let ok = false;
      try { ok = await saveRef.current(next); } catch { ok = false; }
      if (ok) persisted.current = next;
      if (pending.current?.id === id) {
        pending.current = undefined;
        if (current.current === next) dirty.current = !ok;
        setStatus(current.current === next && !ok ? 'error' : 'idle');
      }
      return ok;
    });
    queue.current = operation;
    return operation;
  }
  return { value, edit, commit, status };
}

export function SaveStatus({ status, retry }: { status: 'idle' | 'saving' | 'error'; retry: () => void }) {
  if (status === 'idle') return null;
  return <span className="save-status" role="status">{status === 'saving' ? '正在保存…' : <>保存失败 <button className="text-button" onClick={retry}>重试</button></>}</span>;
}
