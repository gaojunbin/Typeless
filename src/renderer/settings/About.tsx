import { Info } from 'lucide-react';
import type { UpdateError, UpdateState } from '../../shared/contracts';
import { SectionGroup, SettingRow, StatusBadge } from '../ui';
import type { RunAction, SettingsSectionProps } from './types';

const errorMessages: Record<UpdateError, string> = {
  network: '无法连接 GitHub，请稍后重试。',
  invalid_response: 'GitHub 返回了无法识别的内容。',
  no_asset: '此版本没有适用于当前系统的安装包。',
  checksum: '下载文件校验失败，请重新下载。',
  write_failed: '无法写入下载目录。',
};

function badge(update: UpdateState) {
  switch (update.status) {
    case 'checking': return <StatusBadge tone="muted">正在检查…</StatusBadge>;
    case 'none': return <StatusBadge tone="ok">已是最新</StatusBadge>;
    case 'available': return <StatusBadge tone="accent">有新版本 {update.latestVersion}</StatusBadge>;
    case 'downloading': return <StatusBadge tone="muted">下载中 {Math.round((update.progress ?? 0) * 100)}%</StatusBadge>;
    case 'downloaded': return <StatusBadge tone="ok">已下载</StatusBadge>;
    case 'error': return <StatusBadge tone="warn">检查失败</StatusBadge>;
    default: return <StatusBadge tone="muted">未检查</StatusBadge>;
  }
}

function action(update: UpdateState, run: RunAction) {
  switch (update.status) {
    case 'checking': return <button type="button" className="secondary small" disabled>检查中…</button>;
    case 'available': return <button type="button" className="primary small" onClick={() => { void run({ type: 'update.download' }); }}>下载更新</button>;
    case 'downloading': return <button type="button" className="secondary small" disabled>下载中…</button>;
    case 'downloaded': return <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.open' }); }}>打开安装包</button>;
    case 'error': return <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.check' }); }}>重试</button>;
    default: return <button type="button" className="secondary small" onClick={() => { void run({ type: 'update.check' }); }}>检查更新</button>;
  }
}

/** Version row with the GitHub release check. Main owns the state; this only renders it and dispatches. */
export function AboutGroup({ snapshot, run }: SettingsSectionProps) {
  const { update, version, platform } = snapshot;
  const installHint = platform === 'win32' ? '解压后运行 Typeless.exe，覆盖旧文件即可。' : '打开安装包后，把 Typeless 拖入应用程序文件夹并重新打开；升级后需重新授权辅助功能。';
  const notes = [
    update.releaseUrl ? <button key="notes" type="button" className="text-button" onClick={() => { void run({ type: 'update.openRelease' }); }}>更新说明</button> : null,
    update.status === 'downloaded' ? <p key="install" className="pref-hint">{installHint}</p> : null,
    update.status === 'error' && update.error ? <p key="error" className="pref-hint">{errorMessages[update.error]}</p> : null,
  ].filter(Boolean);
  return <SectionGroup icon={<Info size={20} strokeWidth={1.5} />} title="关于">
    <SettingRow inline className="pref-permission-row about-row" label="版本" description={`Typeless ${version}`}
      control={<>{badge(update)}{action(update, run)}</>}
      status={notes.length ? <div className="about-notes">{notes}</div> : undefined} />
  </SectionGroup>;
}
