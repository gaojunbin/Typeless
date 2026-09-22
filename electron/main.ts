import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, nativeImage, powerMonitor, safeStorage, screen, session, shell, systemPreferences, Tray } from 'electron';
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Store } from '../src/core/store';
import { Providers } from '../src/core/providers';
import type { AppAction, CaptureEvent, Permissions } from '../src/shared/contracts';
import { Controller } from './controller';
import { NativeClient, type NativeStatus } from './native-client';
import { VoiceOverlay, voiceWindowSize } from './voice-overlay';
import { ClipboardDelivery } from './clipboard-delivery';
import { shortcutPermissions } from './shortcut-status';

const dataRoot = resolve(process.env.TYPELESS_DATA_DIR || (app.isPackaged ? app.getPath('userData') : join(app.getAppPath(), '.local', 'app')));
mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
for (const key of ['userData', 'sessionData', 'crashDumps'] as const) { const path = join(dataRoot, key === 'userData' ? 'settings' : key); mkdirSync(path, { recursive: true }); app.setPath(key, path); }
app.setAppLogsPath(join(dataRoot, 'logs'));
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
let mainWindow: BrowserWindow;
let overlay: BrowserWindow;
let voiceOverlay: VoiceOverlay;
let tray: Tray;
let controller: Controller;
let store: Store;
let quitting = false;
let shortcutAvailable = false;
let nativeAvailable = false;
let shortcutHealthTimer: ReturnType<typeof setInterval> | undefined;
let refreshingPermissions = false;
let shortcutPresses = 0;
let micTestUntil = 0;
interface StatusTransition {
  at: string;
  accessibility: boolean;
  inputMonitoring: boolean;
  shortcutReason: string;
  tapEnabled: boolean;
  helperPid: number;
  error: string;
}
const statusHistory: StatusTransition[] = [];
let lastTransition = '';
const devUrl = process.env.VITE_DEV_SERVER_URL;
const pageUrl = devUrl ? new URL(devUrl).origin : pathToFileURL(join(app.getAppPath(), 'dist', 'index.html')).toString();
if (devUrl && !['localhost', '127.0.0.1'].includes(new URL(devUrl).hostname)) throw new Error('Development UI must use loopback.');
const native = new NativeClient({ onShortcut: () => shortcutPressed(), onStatus: status => { if (!quitting) { nativeAvailable = !status.error; recordNativeStatus(status); } } });
const delivery = new ClipboardDelivery((text, options) => native.paste(text, options));
function shortcutPressed() {
  if (quitting || !store || !controller) return;
  // The setup guide only has to prove that presses arrive, so it must not start a dictation session.
  if (!store.snapshot().settings.general.setupCompleted) { shortcutPresses += 1; void refreshShortcutHealth(); return; }
  void controller.dispatch({ type: 'dictation.toggle' }).then(reportShortcutError);
}
function reportShortcutError(result: { ok: boolean; message?: string }) {
  if (quitting || !overlay || overlay.isDestroyed()) return;
  if (!result.ok) {
    if (['transcribing', 'polishing', 'inserting'].includes(controller.sessions.session.status)) return;
    const snapshot = controller.snapshot();
    if (snapshot.session.status !== 'error') snapshot.session = { ...snapshot.session, status: 'error', errorCode: 'shortcut_failed', error: result.message };
    overlay.webContents.send('typeless:snapshot', snapshot);
    voiceOverlay.publish(snapshot.session);
  }
}
function trusted(contents: Electron.WebContents, url: string) {
  if (![mainWindow?.webContents.id, overlay?.webContents.id].includes(contents.id)) return false;
  return devUrl ? new URL(url).origin === pageUrl : url.split('#')[0] === pageUrl;
}
function showMain() { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } }
function windowOptions(): Electron.BrowserWindowConstructorOptions {
  return { backgroundColor: '#fdfdfd', webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, backgroundThrottling: false, spellcheck: false } };
}
function secureWindow(window: BrowserWindow) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-attach-webview', event => event.preventDefault());
}
async function load(window: BrowserWindow, hash: string) {
  if (devUrl) await window.loadURL(`${devUrl.replace(/\/$/, '')}/#${hash}`);
  else await window.loadFile(join(app.getAppPath(), 'dist', 'index.html'), { hash });
}
async function permissions(request?: 'microphone' | 'accessibility'): Promise<Permissions> {
  if (request === 'microphone' && process.platform === 'darwin') await systemPreferences.askForMediaAccess('microphone');
  // A helper that cannot take the request still leaves the user a way to grant the permission by hand.
  if (request === 'accessibility') await native.requestAccessibility().catch(() => openPane('accessibility'));
  const nativeStatus = await native.status();
  recordNativeStatus(nativeStatus);
  nativeAvailable = !nativeStatus.error;
  const microphone = process.platform === 'darwin' || process.platform === 'win32' ? systemPreferences.getMediaAccessStatus('microphone') : 'unknown';
  return { microphone: ['granted', 'denied', 'not-determined'].includes(microphone) ? microphone as Permissions['microphone'] : 'unknown', accessibility: nativeStatus.accessibility, nativeAvailable, nativeMessage: nativeStatus.error || '', shortcutPresses, ...shortcutPermissions(nativeStatus, store.snapshot().settings.shortcut.primary, shortcutAvailable) };
}
function openPane(pane: 'microphone' | 'accessibility' | 'inputMonitoring') {
  const panes: Record<typeof pane, string> = { microphone: 'Privacy_Microphone', accessibility: 'Privacy_Accessibility', inputMonitoring: 'Privacy_ListenEvent' };
  // Other platforms have no equivalent pane; opening nothing is a successful no-op.
  if (process.platform === 'darwin') void shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${panes[pane]}`).catch(() => {});
  else if (process.platform === 'win32' && pane === 'microphone') void shell.openExternal('ms-settings:privacy-microphone').catch(() => {});
}
/** Keeps the last 50 helper transitions in memory and on disk, so a stale tap can be diagnosed after the fact. */
function recordNativeStatus(status: NativeStatus) {
  const transition: StatusTransition = {
    at: new Date().toISOString(),
    accessibility: status.accessibility,
    inputMonitoring: status.inputMonitoring,
    shortcutReason: status.shortcutReason || '',
    tapEnabled: Boolean(status.tapEnabled),
    helperPid: status.helperPid || 0,
    error: status.error || '',
  };
  const key = JSON.stringify({ ...transition, at: '' });
  if (key === lastTransition) return;
  lastTransition = key;
  statusHistory.push(transition);
  if (statusHistory.length > 50) statusHistory.splice(0, statusHistory.length - 50);
  const path = join(app.getPath('logs'), 'native-status.log');
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(transition) + '\n', { mode: 0o600 });
    // Keep the log bounded; the retained history is enough to explain a failing tap.
    if (statSync(path).size > 262_144) writeFileSync(path, statusHistory.map(item => JSON.stringify(item) + '\n').join(''), { mode: 0o600 });
  } catch { /* Diagnostics must never interrupt dictation. */ }
}
function bundlePath(): string {
  const executable = app.getPath('exe');
  const suffix = executable.indexOf('/Contents/MacOS/');
  return process.platform === 'darwin' && suffix > 0 ? executable.slice(0, suffix) : executable;
}
/** The code-signing identity the operating system matches permission grants against. */
function bundleCdhash(bundle: string): string {
  if (process.platform !== 'darwin') return 'unknown';
  try {
    const result = spawnSync('/usr/bin/codesign', ['-dvvv', bundle], { timeout: 3000, encoding: 'utf8' });
    const match = /CDHash=([0-9a-fA-F]+)/.exec(`${result.stderr || ''}\n${result.stdout || ''}`);
    return match ? match[1] : 'unknown';
  } catch { return 'unknown'; }
}
function diagnosticsReport(): string {
  const snapshot = controller.snapshot();
  const bundle = bundlePath();
  return [
    `Typeless ${app.getVersion()}`,
    `platform: ${process.platform} ${process.getSystemVersion()}`,
    `packaged: ${app.isPackaged}`,
    `executable: ${app.getPath('exe')}`,
    `bundle: ${bundle}`,
    `cdhash: ${bundleCdhash(bundle)}`,
    `shortcut: ${JSON.stringify(snapshot.settings.shortcut)}`,
    `general: ${JSON.stringify(snapshot.settings.general)}`,
    `audio.deviceId: ${snapshot.settings.audio.deviceId}`,
    `permissions: ${JSON.stringify(snapshot.permissions)}`,
    `native status history (${statusHistory.length}):`,
    ...statusHistory.map(item => JSON.stringify(item)),
  ].join('\n');
}
async function copyDiagnostics(): Promise<void> {
  const report = diagnosticsReport();
  try { clipboard.writeText(report); }
  catch { throw new Error('Diagnostics could not be copied to the clipboard.'); }
}
function relaunch() {
  if (app.isPackaged && process.platform === 'darwin') {
    // Relaunching through `open` on the bundle gives the new instance the same launch identity as Finder does.
    spawn('/bin/sh', ['-c', 'while kill -0 "$1" 2>/dev/null; do sleep 0.2; done; exec /usr/bin/open "$2"', 'sh', String(process.pid), bundlePath()],
      { detached: true, stdio: 'ignore' }).unref();
  } else app.relaunch();
  app.quit();
}
async function refreshShortcutHealth() {
  if (quitting || !controller || refreshingPermissions) return;
  refreshingPermissions = true;
  try { await controller.refreshPermissions(); } catch { /* The next health check retries without prompting. */ }
  finally { refreshingPermissions = false; }
}
async function configureSettings(applyLogin = false, applyShortcut = true) {
  const settings = store.snapshot().settings;
  if (applyShortcut) {
    globalShortcut.unregisterAll();
    try { shortcutAvailable = globalShortcut.register(settings.shortcut.fallback, () => shortcutPressed()); } catch { shortcutAvailable = false; }
    await native.configureShortcut(settings.shortcut.primary).catch(() => {});
  }
  if (applyLogin && app.isPackaged && ['darwin', 'win32'].includes(process.platform)) app.setLoginItemSettings({ openAtLogin: settings.general.launchAtLogin });
  await controller.refreshPermissions();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', showMain);
  app.whenReady().then(async () => {
    store = new Store(join(app.getPath('userData'), 'state.json'), {
      available: () => safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text'),
      encrypt: value => safeStorage.encryptString(value).toString('base64'), decrypt: value => safeStorage.decryptString(Buffer.from(value, 'base64')),
    });
    mainWindow = new BrowserWindow({ ...windowOptions(), width: 1000, height: 750, minWidth: 880, minHeight: 600, show: false, title: 'Typeless', ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 18, y: 18 } } : {}) });
    overlay = new BrowserWindow({ ...windowOptions(), ...voiceWindowSize, frame: false, transparent: true, backgroundColor: '#00000000', focusable: false, show: false, resizable: false, movable: false, minimizable: false, maximizable: false, hasShadow: false, skipTaskbar: true, alwaysOnTop: true, ...(process.platform === 'darwin' ? { type: 'panel' as const } : {}) });
    overlay.setAlwaysOnTop(true, 'floating'); overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    voiceOverlay = new VoiceOverlay(overlay, () => screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea);
    overlay.webContents.on('context-menu', () => {
      const active = ['arming', 'recording', 'transcribing', 'polishing', 'inserting'].includes(controller.sessions.session.status);
      Menu.buildFromTemplate([
        ...(active ? [{ label: '取消听写', click: () => { void controller.dispatch({ type: 'dictation.cancel' }); } }] : []),
        { label: '打开 Typeless', click: showMain },
      ]).popup({ window: overlay });
    });
    secureWindow(mainWindow); secureWindow(overlay);
    const ses = session.defaultSession;
    const connect = devUrl ? `${new URL(devUrl).origin} ${new URL(devUrl).origin.replace(/^http/, 'ws')}` : "'none'";
    const csp = `default-src 'none'; script-src 'self'${devUrl ? " 'unsafe-inline'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src ${connect}; worker-src 'self' blob:; frame-src 'none'; base-uri 'none'; form-action 'none'`;
    ses.webRequest.onHeadersReceived((details, callback) => {
      const local = devUrl ? details.url.startsWith(new URL(devUrl).origin + '/') : details.url.startsWith(pathToFileURL(join(app.getAppPath(), 'dist')).toString() + '/');
      callback({ responseHeaders: { ...details.responseHeaders, ...(local ? { 'Content-Security-Policy': [csp] } : {}) } });
    });
    ses.setPermissionRequestHandler((contents, permission, callback, details) => {
      const allowed = contents.id === mainWindow.webContents.id && trusted(contents, details.requestingUrl || contents.getURL()) && permission === 'media' && ('mediaTypes' in details ? details.mediaTypes || [] : []).every((type: string) => type === 'audio') && (['arming', 'recording'].includes(controller?.sessions.session.status) || micTestUntil > Date.now());
      callback(allowed);
    });
    ses.setPermissionCheckHandler((contents, permission, origin) => Boolean(contents && contents.id === mainWindow.webContents.id && trusted(contents, contents.getURL()) && permission === 'media' && (origin === 'file://' || origin === pageUrl || origin === new URL(pageUrl).origin)));
    ses.on('will-download', (event, item, contents) => {
      if (!contents || contents.id !== mainWindow.webContents.id || !trusted(contents, contents.getURL()) || !item.getURL().startsWith('blob:')) event.preventDefault();
    });
    controller = new Controller(store, new Providers(), {
      capture: command => { if (!quitting && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('typeless:capture', command); },
      paste: (text, signal) => delivery.paste(text, signal),
      publish: snapshot => {
        if (quitting || !mainWindow || mainWindow.isDestroyed() || !overlay || overlay.isDestroyed()) return;
        for (const window of [mainWindow, overlay]) if (!window.isDestroyed()) window.webContents.send('typeless:snapshot', snapshot);
        voiceOverlay.publish(snapshot.session);
      },
      permissions, openPane, microphoneTest: active => { micTestUntil = active ? Date.now() + 120_000 : 0; },
      copy: (text, signal) => delivery.copy(text, signal), show: showMain, hide: () => mainWindow.hide(),
      quit: () => app.quit(), relaunch, copyDiagnostics, settingsChanged: changes => configureSettings(changes.login, changes.shortcut),
    }, app.getVersion());
    const checkSender = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => {
      if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame || !trusted(event.sender, event.senderFrame.url)) throw new Error('Untrusted IPC sender.');
    };
    ipcMain.handle('typeless:snapshot', event => { checkSender(event); return controller.snapshot(); });
    ipcMain.handle('typeless:action', (event, action: AppAction) => {
      checkSender(event);
      if (JSON.stringify(action).length > 1100000) return { ok: false, message: 'Action payload is too large.' };
      return controller.dispatch(action);
    });
    ipcMain.on('typeless:capture-event', (event, payload: CaptureEvent) => {
      try {
        checkSender(event);
        if (event.sender.id !== mainWindow.webContents.id || !payload || typeof payload.sessionId !== 'string' || payload.sessionId.length > 100) return;
        if (payload.type === 'audio' && (!(payload.audio instanceof Uint8Array) || payload.audio.byteLength > 6750000)) return;
        if (payload.type === 'level' && (!Number.isFinite(payload.level) || !Number.isFinite(payload.durationMs))) return;
        if (!['audio', 'error', 'started', 'level'].includes(payload.type)) return;
        void controller.capture(payload);
      } catch { /* Reject invalid messages without exposing process internals. */ }
    });
    mainWindow.on('close', event => { if (!quitting) { event.preventDefault(); mainWindow.hide(); } });
    mainWindow.webContents.on('render-process-gone', () => controller.sessions.cancel());
    mainWindow.webContents.on('did-finish-load', () => controller.publish());
    const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAANUlEQVR4nGNgGLRARk7pPzIeNYBIA5AV4jIAr2GDywCy1eBTQFJgYsNEacZmEMkaqWYAMQAAQnpGfcf9t5IAAAAASUVORK5CYII=');
    if (process.platform === 'darwin') icon.setTemplateImage(true);
    tray = new Tray(icon); tray.setToolTip('Typeless');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: '打开 Typeless', click: showMain }, { label: '开始 / 停止听写', click: () => { void controller.dispatch({ type: 'dictation.toggle' }).then(reportShortcutError); } }, { type: 'separator' }, { label: '退出', click: () => app.quit() }]));
    tray.on('click', showMain);
    await Promise.all([load(mainWindow, 'default'), load(overlay, 'overlay')]);
    showMain();
    try { await native.start(); nativeAvailable = true; } catch { nativeAvailable = false; }
    await configureSettings();
    const cancelForSystem = () => { if (controller.sessions.session.id) controller.sessions.cancel(); voiceOverlay.hide(); };
    powerMonitor.on('lock-screen', cancelForSystem);
    powerMonitor.on('suspend', cancelForSystem);
    powerMonitor.on('resume', () => { void refreshShortcutHealth(); });
    powerMonitor.on('unlock-screen', () => { void refreshShortcutHealth(); });
    shortcutHealthTimer = setInterval(() => { void refreshShortcutHealth(); }, 2000);
    shortcutHealthTimer.unref();
  }).catch(error => { console.error('Typeless initialization failed:', error instanceof Error ? error.stack : 'Unknown initialization error'); dialog.showErrorBox('Typeless', 'The app could not initialize. Check the local data directory and build outputs.'); app.quit(); });
}
app.on('activate', () => { showMain(); void refreshShortcutHealth(); });
app.on('window-all-closed', () => { /* Keep the tray and hidden capture renderer alive. */ });
app.on('before-quit', () => {
  quitting = true; clearInterval(shortcutHealthTimer); voiceOverlay?.hide(); controller?.sessions.cancel(); native.stop(); globalShortcut.unregisterAll();
});
