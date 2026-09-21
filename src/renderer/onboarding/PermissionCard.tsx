import { useState } from 'react';
import { CircleCheck, Info } from 'lucide-react';
import type { RunAction } from '../settings/types';
import { Busy } from '../ui';
import type { PermissionCardModel } from './permissionCards';

function bodyText(card: PermissionCardModel) {
  if (card.state === 'denied') return card.deniedBody ?? card.body;
  if (card.state === 'enabling') return '已授权，正在启用 Fn 监听…';
  if (card.state === 'relaunch') return '已授权，但需要重新打开 Typeless 才能生效。';
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
      <p className="permission-body">{card.state === 'enabling' && <Busy size={14} />}{bodyText(card)}</p>
      <div className="permission-actions">
        {card.state === 'pending' && allow && <button type="button" className="primary" onClick={allow}>允许</button>}
        {card.state === 'denied' && card.id === 'microphone' && <button type="button" className="secondary" onClick={() => { void run({ type: 'permissions.open', pane: 'microphone' }); }}>打开系统设置</button>}
        {card.state === 'relaunch' && <button type="button" className="secondary" onClick={() => { void run({ type: 'app.relaunch' }); }}>重新打开 Typeless</button>}
        {card.state === 'pending' && card.hint && <button type="button" className="icon-button" aria-label="为什么需要此权限" aria-expanded={why} onClick={() => setWhy(current => !current)}><Info size={18} aria-hidden="true" /></button>}
      </div>
      {why && card.hint && <p className="permission-hint">{card.hint}</p>}
    </div>}
  </div>;
}
