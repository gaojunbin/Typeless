import { Info } from 'lucide-react';
import type { UpdateError, UpdateState } from '../../shared/contracts';
import { SectionGroup, SettingRow, StatusBadge } from '../ui';
import { useI18n, type MessageKey, type Translate } from '../i18n';
import type { RunAction, SettingsSectionProps } from './types';

const errorMessages: Record<UpdateError, MessageKey> = {
  network: 'settings.about.error.network',
  invalid_response: 'settings.about.error.invalidResponse',
  no_asset: 'settings.about.error.noAsset',
  checksum: 'settings.about.error.checksum',
  write_failed: 'settings.about.error.writeFailed',
};

function badge(update: UpdateState, t: Translate) {
  switch (update.status) {
    case 'checking': return <StatusBadge tone="muted">{t('settings.about.badge.checking')}</StatusBadge>;
    case 'none': return <StatusBadge tone="ok">{t('settings.about.badge.upToDate')}</StatusBadge>;
    case 'available': return <StatusBadge tone="accent">{t('common.shell.newVersion', { version: update.latestVersion ?? '' })}</StatusBadge>;
    case 'downloading': return <StatusBadge tone="muted">{t('settings.about.badge.downloading', { percent: Math.round((update.progress ?? 0) * 100) })}</StatusBadge>;
    case 'downloaded': return <StatusBadge tone="ok">{t('settings.about.badge.downloaded')}</StatusBadge>;
    case 'error': return <StatusBadge tone="warn">{t('settings.about.badge.failed')}</StatusBadge>;
    default: return <StatusBadge tone="muted">{t('settings.about.badge.unchecked')}</StatusBadge>;
  }
}

function action(update: UpdateState, run: RunAction, t: Translate) {
  switch (update.status) {
    case 'checking': return <button type="button" className="secondary small" disabled>{t('settings.about.checking')}</button>;
    case 'available': return <button type="button" className="primary small" onClick={() => { void run({ type: 'update.download' }); }}>{t('settings.about.download')}</button>;
    case 'downloading': return <button type="button" className="secondary small" disabled>{t('settings.about.downloading')}</button>;
    case 'downloaded': return <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.open' }); }}>{t('settings.about.openInstaller')}</button>;
    case 'error': return <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.check' }); }}>{t('common.retry')}</button>;
    default: return <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.check' }); }}>{t('settings.about.checkUpdates')}</button>;
  }
}

/** Version row with the GitHub release check. Main owns the state; this only renders it and dispatches. */
export function AboutGroup({ snapshot, run }: SettingsSectionProps) {
  const { t } = useI18n();
  const { update, version, platform } = snapshot;
  const installHint = t(platform === 'win32' ? 'settings.about.install.windows' : 'settings.about.install.mac');
  const notes = [
    update.releaseUrl ? <button key="notes" type="button" className="text-button" onClick={() => { void run({ type: 'update.openRelease' }); }}>{t('settings.about.releaseNotes')}</button> : null,
    update.status === 'downloaded' ? <p key="install" className="pref-hint">{installHint}</p> : null,
    update.status === 'error' && update.error ? <p key="error" className="pref-hint">{t(errorMessages[update.error])}</p> : null,
  ].filter(Boolean);
  return <SectionGroup icon={<Info size={20} strokeWidth={1.5} />} title={t('settings.about.group')}>
    <SettingRow inline className="pref-permission-row about-row" label={t('settings.about.version')} description={`Typeless ${version}`}
      control={<>{badge(update, t)}{action(update, run, t)}</>}
      status={notes.length ? <div className="about-notes">{notes}</div> : undefined} />
  </SectionGroup>;
}
