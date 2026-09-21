import type { AppSnapshot } from '../../shared/contracts';
import type { RunAction } from '../settings/types';
import { PermissionCard } from './PermissionCard';
import { permissionCards } from './permissionCards';
import { PrivacyHero } from './PrivacyHero';
import { StepLayout } from './StepLayout';

export function PermissionsStep({ snapshot, run, onNext }: { snapshot: AppSnapshot; run: RunAction; onNext: () => void }) {
  const cards = permissionCards(snapshot);
  // Only the first card that still needs attention stays open; the rest collapse to their title row.
  const open = cards.findIndex(card => card.state !== 'granted');
  const ready = open === -1;
  return <StepLayout
    title="在这台电脑上设置 Typeless"
    subtitle="两项系统权限，只在你听写时使用。"
    hero={<PrivacyHero cards={cards} />}
    footerLeft={<button type="button" className="text-button" onClick={onNext}>稍后在基本设置中授权</button>}
    footerRight={<button type="button" className="primary" disabled={!ready} onClick={onNext}>继续</button>}>
    <div className="setup-permissions">
      {cards.map((card, index) => <PermissionCard key={card.id} card={card} expanded={index === open} run={run} />)}
    </div>
    {snapshot.platform === 'darwin' && <button type="button" className="text-button setup-link" onClick={() => { void run({ type: 'permissions.open', pane: 'inputMonitoring' }); }}>快捷键仍不可用？改用输入监控</button>}
  </StepLayout>;
}
