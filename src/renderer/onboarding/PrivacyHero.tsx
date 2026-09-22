import { Accessibility, Keyboard, Mic } from 'lucide-react';
import { useI18n, type MessageKey } from '../i18n';
import type { PermissionCardModel, PermissionId } from './permissionCards';

const icons = { microphone: Mic, accessibility: Accessibility, helper: Keyboard } as const;
const labelKeys: Record<PermissionId, MessageKey> = {
  microphone: 'onboarding.label.microphone',
  accessibility: 'onboarding.label.accessibility',
  helper: 'onboarding.label.helper',
};

/** Presentational mirror of the system privacy list: one switch per permission card. */
export function PrivacyHero({ cards }: { cards: PermissionCardModel[] }) {
  const { t } = useI18n();
  return <div className="setup-hero setup-hero-privacy" aria-hidden="true">
    {cards.map(card => {
      const Icon = icons[card.id];
      return <p key={card.id} className="privacy-row">
        <Icon size={18} strokeWidth={1.5} />
        <span className="privacy-label">{t(labelKeys[card.id])}</span>
        <span className="privacy-switch" data-on={card.state === 'granted' ? 'true' : 'false'} />
      </p>;
    })}
    <span className="privacy-caption">{t('onboarding.permissions.privacyCaption')}</span>
  </div>;
}
