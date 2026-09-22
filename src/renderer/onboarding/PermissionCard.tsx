import { useState } from 'react';
import { CircleCheck, Info } from 'lucide-react';
import { useI18n, type MessageKey, type Translate } from '../i18n';
import type { RunAction } from '../settings/types';
import { DiagnosticsButton } from './DiagnosticsButton';
import type { PermissionCardModel } from './permissionCards';

/** A grant that predates this build keeps its entry in the system list while the new binary is untrusted. */
function bodyText(card: PermissionCardModel, t: Translate): string {
  if (card.state === 'denied') return t(card.deniedBodyKey ?? card.bodyKey);
  if (card.state === 'stale') return t('onboarding.permissions.stale');
  return t(card.bodyKey);
}

export function PermissionCard({ card, expanded, run }: { card: PermissionCardModel; expanded: boolean; run: RunAction }) {
  const { t } = useI18n();
  const [why, setWhy] = useState(false);
  const hintKey: MessageKey | undefined = card.hintKey;
  const allow = card.id === 'accessibility' || card.id === 'microphone'
    ? () => { void run({ type: 'permissions.request', permission: card.id === 'accessibility' ? 'accessibility' : 'microphone' }); }
    : undefined;
  return <div className="permission-card" data-permission={card.id} data-state={card.state}>
    <div className="permission-head">
      <h3>{t(card.titleKey)}</h3>
      {card.state === 'granted' && <CircleCheck size={22} className="permission-check" aria-hidden="true" />}
    </div>
    {expanded && <div className="permission-detail">
      <p className="permission-body">{bodyText(card, t)}</p>
      <div className="permission-actions">
        {card.state === 'pending' && allow && <button type="button" className="primary" onClick={allow}>{t('onboarding.allow')}</button>}
        {card.state === 'denied' && card.id === 'microphone' && <button type="button" className="secondary" onClick={() => { void run({ type: 'permissions.open', pane: 'microphone' }); }}>{t('onboarding.openSystemSettings')}</button>}
        {card.state === 'stale' && <>
          <button type="button" className="primary" onClick={() => { void run({ type: 'app.relaunch' }); }}>{t('onboarding.reopen')}</button>
          <button type="button" className="secondary" onClick={() => { void run({ type: 'permissions.open', pane: 'accessibility' }); }}>{t('onboarding.openSystemSettings')}</button>
          <DiagnosticsButton run={run} />
        </>}
        {card.state === 'pending' && hintKey && <button type="button" className="icon-button" aria-label={t('onboarding.permissions.why')} aria-expanded={why} onClick={() => setWhy(current => !current)}><Info size={18} aria-hidden="true" /></button>}
      </div>
      {why && hintKey && <p className="permission-hint">{t(hintKey)}</p>}
    </div>}
  </div>;
}
