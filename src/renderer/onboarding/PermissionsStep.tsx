import type { AppSnapshot } from '../../shared/contracts';
import { useI18n } from '../i18n';
import type { RunAction } from '../settings/types';
import { PermissionCard } from './PermissionCard';
import { permissionCards } from './permissionCards';
import { PrivacyHero } from './PrivacyHero';
import { StepLayout } from './StepLayout';

export function PermissionsStep({ snapshot, run, onNext }: { snapshot: AppSnapshot; run: RunAction; onNext: () => void }) {
  const { t } = useI18n();
  const cards = permissionCards(snapshot);
  // Only the first card that still needs attention stays open; the rest collapse to their title row.
  const open = cards.findIndex(card => card.state !== 'granted');
  const ready = open === -1;
  return <StepLayout
    title={t('onboarding.permissions.title')}
    subtitle={t('onboarding.permissions.subtitle')}
    hero={<PrivacyHero cards={cards} />}
    footerLeft={<button type="button" className="text-button" onClick={onNext}>{t('onboarding.permissions.later')}</button>}
    footerRight={<button type="button" className="primary" disabled={!ready} onClick={onNext}>{t('onboarding.continue')}</button>}>
    <div className="setup-permissions">
      {cards.map((card, index) => <PermissionCard key={card.id} card={card} expanded={index === open} run={run} />)}
    </div>
    {snapshot.platform === 'darwin' && <button type="button" className="text-button setup-link" onClick={() => { void run({ type: 'permissions.open', pane: 'inputMonitoring' }); }}>{t('onboarding.permissions.inputMonitoring')}</button>}
  </StepLayout>;
}
