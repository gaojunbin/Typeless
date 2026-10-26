import { Info } from 'lucide-react';
import type { AppSettings } from '../../shared/contracts';
import { Card } from '../ui';
import { useI18n, type MessageKey } from '../i18n';
import type { SettingsTab } from '../settings/types';
import { writingLevel } from '../writingPresentation';

/** Why the vocabulary cannot correct anything right now, or undefined when polishing can use it. */
function inactiveReason(settings: AppSettings): MessageKey | undefined {
  if (writingLevel(settings) === 'none') return 'vocabulary.note.off';
  if (!settings.cleanup.hasApiKey || !settings.cleanup.model.trim()) return 'vocabulary.note.unconfigured';
  return undefined;
}

/** A quiet gray note, not an alert: the words are kept and apply once polishing is on and connected. */
export function InactiveNote({ settings, openSettings }: { settings: AppSettings; openSettings: (tab: SettingsTab) => void }) {
  const { t } = useI18n();
  const reason = inactiveReason(settings);
  if (!reason) return null;
  return <Card tone="muted" className="vocabulary-note">
    <Info size={16} strokeWidth={1.5} aria-hidden="true" />
    <span>{t(reason)}</span>
    <button type="button" className="text-button" onClick={() => openSettings('ai')}>{t('common.page.ai')}</button>
  </Card>;
}
