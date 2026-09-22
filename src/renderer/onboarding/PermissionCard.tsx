import { useState } from 'react';
import { CircleCheck, Info } from 'lucide-react';
import type { RunAction } from '../settings/types';
import { DiagnosticsButton } from './DiagnosticsButton';
import type { PermissionCardModel } from './permissionCards';

/** A grant that predates this build keeps its entry in the system list while the new binary is untrusted. */
const staleBody = '系统显示已授权，但 Fn 监听尚未生效。请先重新打开 Typeless；如果重新打开后仍显示待授权，说明是升级前留下的旧授权：请在系统设置 → 隐私与安全性 → 辅助功能与输入监控中移除 Typeless 并重新添加。';

function bodyText(card: PermissionCardModel) {
  if (card.state === 'denied') return card.deniedBody ?? card.body;
  if (card.state === 'stale') return staleBody;
  return card.body;
}

export function PermissionCard({ card, expanded, run }: { card: PermissionCardModel; expanded: boolean; run: RunAction }) {
  const [why, setWhy] = useState(false);
  const allow = card.id === 'accessibility' || card.id === 'microphone'
    ? () => { void run({ type: 'permissions.request', permission: card.id === 'accessibility' ? 'accessibility' : 'microphone' }); }
    : undefined;
  return <div className="permission-card" data-permission={card.id} data-state={card.state}>
    <div className="permission-head">
      <h3>{card.title}</h3>
      {card.state === 'granted' && <CircleCheck size={22} className="permission-check" aria-hidden="true" />}
    </div>
    {expanded && <div className="permission-detail">
      <p className="permission-body">{bodyText(card)}</p>
      <div className="permission-actions">
        {card.state === 'pending' && allow && <button type="button" className="primary" onClick={allow}>允许</button>}
        {card.state === 'denied' && card.id === 'microphone' && <button type="button" className="secondary" onClick={() => { void run({ type: 'permissions.open', pane: 'microphone' }); }}>打开系统设置</button>}
        {card.state === 'stale' && <>
          <button type="button" className="primary" onClick={() => { void run({ type: 'app.relaunch' }); }}>重新打开 Typeless</button>
          <button type="button" className="secondary" onClick={() => { void run({ type: 'permissions.open', pane: 'accessibility' }); }}>打开系统设置</button>
          <DiagnosticsButton run={run} />
        </>}
        {card.state === 'pending' && card.hint && <button type="button" className="icon-button" aria-label="为什么需要此权限" aria-expanded={why} onClick={() => setWhy(current => !current)}><Info size={18} aria-hidden="true" /></button>}
      </div>
      {why && card.hint && <p className="permission-hint">{card.hint}</p>}
    </div>}
  </div>;
}
