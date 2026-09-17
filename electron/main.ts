import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, powerMonitor, safeStorage, screen, session, systemPreferences, Tray } from 'electron';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Store } from '../src/core/store';
import { Providers } from '../src/core/providers';
import type { AppAction, CaptureEvent, Permissions } from '../src/shared/contracts';
import { Controller } from './controller';
import { NativeClient } from './native-client';
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
let retentionTimer: ReturnType<typeof setInterval> | undefined;
let shortcutHealthTimer: ReturnType<typeof setInterval> | undefined;
let refreshingPermissions = false;
const devUrl = process.env.VITE_DEV_SERVER_URL;
const pageUrl = devUrl ? new URL(devUrl).origin : pathToFileURL(join(app.getAppPath(), 'dist', 'index.html')).toString();
if (devUrl && !['localhost', '127.0.0.1'].includes(new URL(devUrl).hostname)) throw new Error('Development UI must use loopback.');
const native = new NativeClient({ onShortcut: () => { if (quitting) return; void controller?.dispatch({ type: 'dictation.toggle' }).then(reportShortcutError); }, onStatus: status => { if (!quitting) nativeAvailable = !status.error; } });
const delivery = new ClipboardDelivery((text, options) => native.paste(text, options));
function reportShortcutError(result: { ok: boolean; message?: string }) {
  if (quitting || !overlay || overlay.isDestroyed()) return;
  if (!result.ok) {
    if (['transcribing', 'polishing', 'inserting'].includes(controller.sessions.session.status)) return;
    const snapshot = controller.snapshot();
    if (snapshot.session.status !== 'error') snapshot.session = { ...snapshot.session, status: 'error', practice: false, errorCode: 'shortcut_failed', error: result.message };
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
  return { backgroundColor: '#fafafa', webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, backgroundThrottling: false, spellcheck: false } };
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
  if (request === 'accessibility') await native.requestAccessibility();
  const nativeStatus = await native.status();
  nativeAvailable = !nativeStatus.error;
  const microphone = process.platform === 'darwin' || process.platform === 'win32' ? systemPreferences.getMediaAccessStatus('microphone') : 'unknown';
  return { microphone: ['granted', 'denied', 'not-determined'].includes(microphone) ? microphone as Permissions['microphone'] : 'unknown', accessibility: nativeStatus.accessibility, nativeAvailable, nativeMessage: nativeStatus.error || '', ...shortcutPermissions(nativeStatus, store.snapshot().settings.shortcut.primary, shortcutAvailable) };
}
async function refreshShortcutHealth() {
  if (quitting || !controller || refreshingPermissions) return;
  refreshingPermissions = true;
  try { await controller.refreshPermissions(); } catch { /* The next health check retries without prompting. */ }
  finally { refreshingPermissions = false; }
}
async function configureSettings(applyLogin = false) {
  const settings = store.snapshot().settings;
  globalShortcut.unregisterAll();
  try { shortcutAvailable = globalShortcut.register(settings.shortcut.fallback, () => { void controller.dispatch({ type: 'dictation.toggle' }).then(reportShortcutError); }); } catch { shortcutAvailable = false; }
  await native.configureShortcut(settings.shortcut.primary).catch(() => {});
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
    mainWindow = new BrowserWindow({ ...windowOptions(), width: 1120, height: 800, minWidth: 840, minHeight: 600, show: false, title: 'Typeless' });
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
      const allowed = contents.id === mainWindow.webContents.id && trusted(contents, details.requestingUrl || contents.getURL()) && permission === 'media' && ('mediaTypes' in details ? details.mediaTypes || [] : []).every((type: string) => type === 'audio') && ['arming', 'recording'].includes(controller?.sessions.session.status);
      callback(allowed);
    });
    ses.setPermissionCheckHandler((contents, permission, origin) => Boolean(contents && contents.id === mainWindow.webContents.id && trusted(contents, contents.getURL()) && permission === 'media' && (origin === 'file://' || origin === pageUrl || origin === new URL(pageUrl).origin)));
    ses.on('will-download', (event, item, contents) => {
      if (!contents || contents.id !== mainWindow.webContents.id || !trusted(contents, contents.getURL()) || !item.getURL().startsWith('blob:')) event.preventDefault();
    });
    controller = new Controller(store, new Providers(), {
      capture: command => { if (!quitting && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('typeless:capture', command); },
      context: () => native.context(),
      paste: (text, signal) => delivery.paste(text, signal),
      publish: snapshot => {
        if (quitting || !mainWindow || mainWindow.isDestroyed() || !overlay || overlay.isDestroyed()) return;
        for (const window of [mainWindow, overlay]) if (!window.isDestroyed()) window.webContents.send('typeless:snapshot', snapshot);
        voiceOverlay.publish(snapshot.session);
      },
      permissions, copy: (text, signal) => delivery.copy(text, signal), show: showMain, hide: () => mainWindow.hide(), quit: () => app.quit(), settingsChanged: loginChanged => configureSettings(loginChanged),
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
    retentionTimer = setInterval(() => { store.prune(); controller.publish(); }, 60000);
    retentionTimer.unref();
  }).catch(error => { console.error('Typeless initialization failed:', error instanceof Error ? error.stack : 'Unknown initialization error'); dialog.showErrorBox('Typeless', 'The app could not initialize. Check the local data directory and build outputs.'); app.quit(); });
}
app.on('activate', () => { showMain(); void refreshShortcutHealth(); });
app.on('window-all-closed', () => { /* Keep the tray and hidden capture renderer alive. */ });
app.on('before-quit', () => {
  quitting = true; clearInterval(retentionTimer); clearInterval(shortcutHealthTimer); voiceOverlay?.hide(); controller?.sessions.cancel(); native.stop(); globalShortcut.unregisterAll();
});
