import { Info } from 'lucide-react';
import { installErrors, type UpdateError, type UpdateState } from '../../shared/contracts';
import { SectionGroup, SettingRow, StatusBadge } from '../ui';
import { useI18n, type MessageKey, type Translate } from '../i18n';
import type { RunAction, SettingsSectionProps } from './types';

const errorMessages: Record<UpdateError, MessageKey> = {
  network: 'settings.about.error.network',
  invalid_response: 'settings.about.error.invalidResponse',
  no_asset: 'settings.about.error.noAsset',
  checksum: 'settings.about.error.checksum',
  write_failed: 'settings.about.error.writeFailed',
  not_installed: 'settings.about.error.notInstalled',
  mount_failed: 'settings.about.error.mountFailed',
  invalid_installer: 'settings.about.error.invalidInstaller',
  install_failed: 'settings.about.error.installFailed',
};

/** A failed in-place install keeps the downloaded installer, so the row offers a retry and the manual path. */
const installFailed = (update: UpdateState) => update.status === 'error' && !!update.error && (installErrors as readonly string[]).includes(update.error) && !!update.filePath;

function badge(update: UpdateState, t: Translate) {
  switch (update.status) {
    case 'checking': return <StatusBadge tone="muted">{t('settings.about.badge.checking')}</StatusBadge>;
    case 'none': return <StatusBadge tone="ok">{t('settings.about.badge.upToDate')}</StatusBadge>;
    case 'available': return <StatusBadge tone="accent">{t('common.shell.newVersion', { version: update.latestVersion ?? '' })}</StatusBadge>;
    case 'downloading': return <StatusBadge tone="muted">{t('settings.about.badge.downloading', { percent: Math.round((update.progress ?? 0) * 100) })}</StatusBadge>;
    case 'downloaded': return <StatusBadge tone="ok">{t('settings.about.badge.downloaded')}</StatusBadge>;
    case 'installing': return <StatusBadge tone="muted">{t('settings.about.badge.installing')}</StatusBadge>;
    case 'error': return <StatusBadge tone="warn">{t(installFailed(update) ? 'settings.about.badge.installFailed' : 'settings.about.badge.failed')}</StatusBadge>;
    default: return <StatusBadge tone="muted">{t('settings.about.badge.unchecked')}</StatusBadge>;
  }
}

function action(update: UpdateState, inPlace: boolean, run: RunAction, t: Translate) {
  switch (update.status) {
    case 'checking': return <button type="button" className="secondary small" disabled>{t('settings.about.checking')}</button>;
    case 'available': return <button type="button" className="primary small" onClick={() => { void run({ type: 'update.download' }); }}>{t('settings.about.download')}</button>;
    case 'downloading': return <button type="button" className="secondary small" disabled>{t('settings.about.downloading')}</button>;
    case 'downloaded': return inPlace
      ? <button type="button" className="primary small" onClick={() => { void run({ type: 'update.install' }); }}>{t('settings.about.install')}</button>
      : <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.open' }); }}>{t('settings.about.openInstaller')}</button>;
    case 'installing': return <button type="button" className="secondary small" disabled>{t('settings.about.installing')}</button>;
    case 'error': return installFailed(update)
      ? <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.install' }); }}>{t('settings.about.retryInstall')}</button>
      : <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.check' }); }}>{t('common.retry')}</button>;
    default: return <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.check' }); }}>{t('settings.about.checkUpdates')}</button>;
  }
}

/** Version row with the GitHub release check. Main owns the state; this only renders it and dispatches. */
export function AboutGroup({ snapshot, run }: SettingsSectionProps) {
  const { t } = useI18n();
  const { update, version, platform } = snapshot;
  // macOS installs in place and relaunches; Windows still opens the archive for a manual install.
  const inPlace = platform === 'darwin';
  const installHint = t(platform === 'win32' ? 'settings.about.install.windows' : 'settings.about.install.mac');
  const manualOpen = inPlace && !!update.filePath && (update.status === 'downloaded' || installFailed(update));
  const notes = [
    update.releaseUrl ? <button key="notes" type="button" className="text-button" onClick={() => { void run({ type: 'update.openRelease' }); }}>{t('settings.about.releaseNotes')}</button> : null,
    manualOpen ? <button key="open" type="button" className="text-button" onClick={() => { void run({ type: 'update.open' }); }}>{t('settings.about.openInstaller')}</button> : null,
    update.status === 'downloaded' ? <p key="install" className="pref-hint">{installHint}</p> : null,
    update.status === 'error' && update.error ? <p key="error" className="pref-hint">{t(errorMessages[update.error])}</p> : null,
  ].filter(Boolean);
  return <SectionGroup icon={<Info size={20} strokeWidth={1.5} />} title={t('settings.about.group')}>
    <SettingRow inline className="pref-permission-row about-row" label={t('settings.about.version')} description={`Typeless ${version}`}
      control={<>{badge(update, t)}{action(update, inPlace, run, t)}</>}
      status={notes.length ? <div className="about-notes">{notes}</div> : undefined} />
  </SectionGroup>;
}
