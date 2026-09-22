import { useEffect, useRef, useState } from 'react';
import type { RunAction } from '../settings/types';

const copiedLabelMs = 2000;

/**
 * Copies the diagnostics report and confirms for two seconds.
 * Shared by the stale permission card and the 系统权限 group, so both read the same copy.
 */
export function DiagnosticsButton({ run, className = 'secondary' }: { run: RunAction; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = async () => {
    if (!await run({ type: 'diagnostics.copy' })) return;
    if (timer.current) clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), copiedLabelMs);
  };
  return <button type="button" className={className} onClick={() => { void copy(); }}>{copied ? '已复制' : '复制诊断信息'}</button>;
}
