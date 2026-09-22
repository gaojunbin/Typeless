import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Laptop, Mic, ShieldCheck } from 'lucide-react';
import { KeyChips, PageHeader, SectionGroup, Segmented, SettingRow, StatusBadge } from '../ui';
import { useI18n } from '../i18n';
import type { Language } from '../../shared/contracts';
import { shortcutLabel } from '../shortcutPresentation';
import { AboutGroup } from './About';
import { SaveStatus, useSettingDraft } from './Autosave';
import type { SettingsSectionProps } from './types';
import { inputMonitoringStatus, primaryShortcutStatus } from '../onboarding/permissionStatus';
import { DiagnosticsButton } from '../onboarding/DiagnosticsButton';
import '../styles/preferences.css';

const fallbackPresets = ['CommandOrControl+Shift+Space', 'CommandOrControl+Shift+D', 'CommandOrControl+Alt+Space'];
const groupIcon = { size: 20, strokeWidth: 1.5 } as const;

/** Renders nothing while the draft is idle, so `.save-status` only exists during a save or after a failure. */
function saving(status: 'idle' | 'saving' | 'error', retry: () => void) {
  return status === 'idle' ? null : <SaveStatus status={status} retry={retry} />;
}

function SelectRow({ id, label, description, saved, save, status, children }: {
  id: string; label: string; description?: ReactNode; saved: string; save: (value: string) => Promise<boolean>; status?: ReactNode; children: ReactNode;
}) {
  const draft = useSettingDraft(saved, save);
  const progress = saving(draft.status, () => { void draft.commit(); });
  return <SettingRow label={label} description={description} htmlFor={id}
    control={<select id={id} value={draft.value} disabled={draft.status === 'saving'} onChange={event => { draft.edit(event.target.value); void draft.commit(event.target.value); }}>{children}</select>}
    status={status || progress ? <div className="pref-status">{status}{progress}</div> : undefined} />;
}

function SwitchRow({ label, description, saved, save }: { label: string; description?: ReactNode; saved: boolean; save: (value: boolean) => Promise<boolean> }) {
  const draft = useSettingDraft(saved, save);
  return <SettingRow inline className="pref-switch-row" label={label} description={description}
    control={<input type="checkbox" role="switch" aria-label={label} checked={draft.value} disabled={draft.status === 'saving'} onChange={event => { draft.edit(event.target.checked); void draft.commit(event.target.checked); }} />}
    status={saving(draft.status, () => { void draft.commit(); })} />;
}

/** Interface language. Autosaves like the switches, and the whole tree re-renders once the snapshot returns. */
function LanguageRow({ snapshot, run }: SettingsSectionProps) {
  const { t } = useI18n();
  const draft = useSettingDraft<Language>(snapshot.settings.general.language, language => run({ type: 'settings.save', patch: { general: { language } } }));
  const label = t('common.language.label');
  const options = [{ value: 'zh' as Language, label: t('common.language.zh') }, { value: 'en' as Language, label: t('common.language.en') }];
  return <SettingRow inline className="pref-switch-row" label={label}
    control={<Segmented ariaLabel={label} options={options} value={draft.value} disabled={draft.status === 'saving'} onChange={value => { draft.edit(value); void draft.commit(value); }} />}
    status={saving(draft.status, () => { void draft.commit(); })} />;
}

function PermissionRow({ label, granted, text, action }: { label: string; granted: boolean; text: string; action?: { label: string; onClick: () => void } }) {
  return <SettingRow inline className="pref-permission-row" label={label} control={<>
    <StatusBadge tone={granted ? 'ok' : 'warn'}>{text}</StatusBadge>
    {action && <button type="button" className="secondary small" onClick={action.onClick}>{action.label}</button>}
  </>} />;
}

export function BasicSettings({ snapshot, run }: SettingsSectionProps) {
  const { t } = useI18n();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    let live = true;
    const load = async () => { try { const list = await navigator.mediaDevices.enumerateDevices(); if (live) setDevices(list.filter(device => device.kind === 'audioinput')); } catch { /* The system default remains available. */ } };
    void load(); navigator.mediaDevices.addEventListener('devicechange', load);
    return () => { live = false; navigator.mediaDevices.removeEventListener('devicechange', load); };
  }, [snapshot.permissions.microphone]);
  const { settings, permissions, platform } = snapshot;
  const mac = platform === 'darwin';
  const primary = platform === 'win32' ? 'RightAlt' : 'Fn';
  const off = settings.shortcut.primary.toLowerCase() === 'disabled';
  const shortcutState = primaryShortcutStatus(snapshot, t);
  const inputMonitoring = inputMonitoringStatus(snapshot, t);
  const fallbackChoices = fallbackPresets.includes(settings.shortcut.fallback) ? fallbackPresets : [settings.shortcut.fallback, ...fallbackPresets];
  const openAccessibility = () => { void run({ type: 'permissions.request', permission: 'accessibility' }); };
  const openPane = (pane: 'microphone' | 'inputMonitoring') => () => { void run({ type: 'permissions.open', pane }); };
  const openSettings = t('settings.permissions.openSystemSettings');
  return <>
    <PageHeader title={t('common.page.basic')} subtitle={t('settings.basic.subtitle')} />
    <SectionGroup icon={<Keyboard {...groupIcon} />} title={t('settings.shortcut.group')}>
      <SelectRow id="pref-shortcut-primary" label={t('settings.shortcut.primary.label')} description={t('settings.shortcut.primary.description')}
        saved={off ? 'Disabled' : primary} save={value => run({ type: 'settings.save', patch: { shortcut: { primary: value } } })}
        status={<div className="pref-shortcut-status">
          <StatusBadge tone={shortcutState.tone}>{shortcutState.text}</StatusBadge>
          {permissions.shortcutMessage === 'relaunch_required' && <button type="button" className="secondary small" onClick={() => { void run({ type: 'app.relaunch' }); }}>{t('settings.shortcut.reopen')}</button>}
          {!off && <KeyChips binding={settings.shortcut.primary} mac={mac} />}
        </div>}>
        <option value={primary}>{t('settings.shortcut.primary.option', { key: primary === 'Fn' ? 'Fn' : 'Right Alt' })}</option>
        <option value="Disabled">{t('settings.shortcut.primary.off')}</option>
      </SelectRow>
      <SelectRow id="pref-shortcut-fallback" label={t('settings.shortcut.fallback.label')}
        saved={settings.shortcut.fallback} save={value => run({ type: 'settings.save', patch: { shortcut: { fallback: value } } })}
        status={<StatusBadge tone={permissions.fallbackShortcutAvailable ? 'ok' : 'warn'}>{t(permissions.fallbackShortcutAvailable ? 'settings.shortcut.fallback.ready' : 'settings.shortcut.fallback.unavailable')}</StatusBadge>}>
        {fallbackChoices.map(binding => <option key={binding} value={binding}>{shortcutLabel(binding, mac)}</option>)}
      </SelectRow>
    </SectionGroup>
    <SectionGroup icon={<Mic {...groupIcon} />} title={t('settings.audio.group')}>
      <SelectRow id="pref-microphone" label={t('settings.audio.microphone')} saved={settings.audio.deviceId} save={deviceId => run({ type: 'settings.save', patch: { audio: { deviceId } } })}>
        <option value="default">{t('settings.audio.systemDefault')}</option>
        {devices.filter(device => device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || t('settings.audio.microphoneIndex', { index: index + 1 })}</option>)}
      </SelectRow>
      <SwitchRow label={t('settings.audio.sounds')} saved={settings.audio.interactionSounds} save={interactionSounds => run({ type: 'settings.save', patch: { audio: { interactionSounds } } })} />
    </SectionGroup>
    <SectionGroup icon={<Laptop {...groupIcon} />} title={t('settings.general.group')}>
      <LanguageRow snapshot={snapshot} run={run} />
      <SwitchRow label={t('settings.general.autoInsert.label')} description={t('settings.general.autoInsert.description')} saved={settings.general.autoInsert} save={autoInsert => run({ type: 'settings.save', patch: { general: { autoInsert } } })} />
      <SwitchRow label={t('settings.general.launchAtLogin.label')} saved={settings.general.launchAtLogin} save={launchAtLogin => run({ type: 'settings.save', patch: { general: { launchAtLogin } } })} />
    </SectionGroup>
    <SectionGroup icon={<ShieldCheck {...groupIcon} />} title={t('settings.permissions.group')}>
      <PermissionRow label={t('settings.audio.microphone')} granted={permissions.microphone === 'granted'} text={t(permissions.microphone === 'granted' ? 'settings.permissions.granted' : 'settings.permissions.pending')}
        action={permissions.microphone === 'granted' ? undefined
          : permissions.microphone === 'denied' ? { label: openSettings, onClick: openPane('microphone') }
          : { label: t('settings.permissions.allow'), onClick: () => { void run({ type: 'permissions.request', permission: 'microphone' }); } }} />
      {mac
        ? <PermissionRow label={t('settings.permissions.accessibility')} granted={permissions.accessibility} text={t(permissions.accessibility ? 'settings.permissions.granted' : 'settings.permissions.pending')} action={{ label: openSettings, onClick: openAccessibility }} />
        : <PermissionRow label={t('settings.permissions.assistant')} granted={permissions.nativeAvailable} text={t(permissions.nativeAvailable ? 'settings.permissions.assistant.ready' : 'settings.permissions.assistant.unavailable')} action={{ label: openSettings, onClick: openAccessibility }} />}
      {mac && <PermissionRow label={t('settings.permissions.inputMonitoring')} granted={inputMonitoring.ok} text={inputMonitoring.text}
        action={inputMonitoring.ok ? undefined : { label: openSettings, onClick: openPane('inputMonitoring') }} />}
      <SettingRow inline className="pref-permission-row" label={t('settings.permissions.setupGuide.label')} description={t('settings.permissions.setupGuide.description')}
        control={<button type="button" className="secondary small" onClick={() => { void run({ type: 'settings.save', patch: { general: { setupCompleted: false } } }); }}>{t('settings.permissions.setupGuide.action')}</button>} />
      <SettingRow inline className="pref-permission-row" label={t('settings.permissions.diagnostics.label')} description={t('settings.permissions.diagnostics.description')}
        control={<DiagnosticsButton run={run} className="secondary small" />} />
    </SectionGroup>
    <AboutGroup snapshot={snapshot} run={run} />
  </>;
}
