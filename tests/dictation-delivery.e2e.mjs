import { _electron as electron } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

// Real NativeClient/helper system paste into a separate disposable Electron application.
// Audio, providers, and credential encryption are test doubles. No physical Fn tap is simulated.
const root = resolve('.');
await mkdir(join(root, '.local'), { recursive: true });
const dataRoot = await mkdtemp(join(root, '.local', 'delivery-e2e-'));
const fixturePath = join(dataRoot, 'target.cjs');
const enableTargetAccessibility = process.env.TYPELESS_TEST_TARGET_AX === '1';
const instances = [];
const ownPids = new Set();
const checks = [];
const screenshots = {};
const clipboardDiagnostics = [];
let clipboardStaged = false;
const requests = [];
let app;
let fixture;
let mainPage;
let currentStage = 'initialize';
let receipt;
const utterance = 'Synthetic delivery: 你好，Typeless。';
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function stage(value) { currentStage = value; console.log(`[delivery-e2e] ${value}`); }
class Blocked extends Error { constructor(message) { super(message); this.name = 'Blocked'; } }
function descendantPids() {
  const owned = new Set(ownPids);
  if (process.platform !== 'win32') {
    try {
      const rows = execFileSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8', timeout: 1500 }).trim().split('\n').map(row => row.trim().split(/\s+/).map(Number));
      let added = true;
      while (added) { added = false; for (const [pid, parent] of rows) if (owned.has(parent) && !owned.has(pid)) { owned.add(pid); added = true; } }
    } catch { /* Only recorded app roots remain eligible for cleanup. */ }
  }
  return [...owned];
}
function killOwned(pids = descendantPids()) {
  if (process.platform === 'win32') {
    for (const pid of ownPids) { try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 2000 }); } catch {} }
  } else for (const pid of pids.reverse()) { try { process.kill(pid, 'SIGKILL'); } catch {} }
}
async function restoreClipboard() {
  if (!app || !clipboardStaged) return 'not-staged';
  return app.evaluate(async () => globalThis.__restoreDeliveryClipboard?.() ?? 'not-staged').catch(() => 'unavailable');
}
async function closeInstances() {
  const descendants = descendantPids();
  await Promise.all(instances.map(async instance => {
    let timer;
    try { await Promise.race([instance.close(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Close timed out.')), 3000); })]); }
    catch { /* Kill only these launched applications and their recorded descendants below. */ }
    finally { clearTimeout(timer); }
  }));
  killOwned(descendants);
}
const server = createServer(async (request, response) => {
  try {
    let raw = '';
    for await (const chunk of request) { raw += chunk; if (raw.length > 10000000) { response.writeHead(413).end(); return; } }
    const body = raw ? JSON.parse(raw) : undefined;
    requests.push({ path: request.url, model: body?.model });
    response.setHeader('Content-Type', 'application/json');
    if (request.url !== '/v1/chat/completions') { response.writeHead(404).end('{}'); return; }
    // Keep both processing stages observable without changing production code.
    await pause(1000);
    if (!response.destroyed) response.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: utterance } }] }));
  } catch { if (!response.destroyed) response.writeHead(500).end('{}'); }
});
const deadline = setTimeout(() => {
  console.error(JSON.stringify({ ok: false, status: 'failed', stage: currentStage, error: 'Delivery E2E exceeded its 90-second wall deadline.', dataRoot }));
  killOwned(); server.closeAllConnections(); rmSync(fixturePath, { force: true }); process.exit(2);
}, 90000);
const cleanupDeadline = setTimeout(async () => {
  await dispatch({ type: 'dictation.cancel' }).catch(() => {});
  await pause(1300);
  await restoreClipboard();
}, 86000);
async function launch(options) {
  const instance = await electron.launch({ ...options, timeout: 20000 });
  instances.push(instance); ownPids.add(instance.process().pid);
  return instance;
}
async function until(read, accept, message, timeout = 12000) {
  const end = Date.now() + timeout;
  let value;
  do { value = await read(); if (accept(value)) return value; await pause(70); } while (Date.now() < end);
  throw new Error(message);
}
const dispatch = action => mainPage.evaluate(action => window.typeless.dispatch(action), action);
const snapshot = () => mainPage.evaluate(() => window.typeless.getSnapshot());
async function nativeWindows() {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(window => ({ url: window.webContents.getURL(), bounds: window.getBounds(), visible: window.isVisible(), focused: window.isFocused(), focusable: window.isFocusable() })));
}
function assertCaptureStarted(state) {
  if (state.session.status !== 'error') return state;
  const code = state.session.errorCode;
  throw new Error(`Recording failed: ${code || 'unknown'}: ${state.session.error || ''}`);
}
try {
  if (!['darwin', 'win32'].includes(process.platform)) throw new Blocked('Native delivery supports macOS and Windows; this host is unsupported.');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
  const environment = { ...process.env, ELECTRON_ENABLE_LOGGING: '0' };
  delete environment.ELECTRON_RUN_AS_NODE; delete environment.VITE_DEV_SERVER_URL;
  stage('launch Typeless with isolated fake-provider profile');
  app = await launch({ executablePath: process.env.TYPELESS_EXECUTABLE || undefined, args: [...(process.env.TYPELESS_EXECUTABLE ? [] : [root]), '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], env: { ...environment, TYPELESS_DATA_DIR: join(dataRoot, 'typeless') } });
  await app.evaluate(({ safeStorage }) => {
    safeStorage.isEncryptionAvailable = () => true;
    safeStorage.encryptString = value => Buffer.from(`TEST-ONLY:${value}`);
    safeStorage.decryptString = buffer => buffer.toString().replace(/^TEST-ONLY:/, '');
  });
  mainPage = await until(() => Promise.resolve(app.windows().find(page => page.url().endsWith('#default'))), Boolean, 'Typeless main renderer was not found.');
  await mainPage.waitForFunction(() => Boolean(window.typeless), undefined, { timeout: 10000 });
  await dispatch({ type: 'permissions.refresh' });
  const configured = await dispatch({ type: 'settings.save', patch: { asr: { kind: 'mimo', baseUrl, model: 'mimo-v2.5-asr' }, cleanup: { enabled: true, baseUrl, model: 'test-cleanup' }, general: { autoInsert: true } }, secrets: { asr: 'FAKE-DELIVERY-ASR', cleanup: 'FAKE-DELIVERY-TEXT' } });
  assert.equal(configured.ok, true, configured.message);
  const fixtureHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Disposable delivery target</title></head><body><form id="form"><label>Textarea<textarea id="textarea" rows="5" cols="65">textarea: SELECT :end</textarea></label><label>Editable conversation<div id="editable" contenteditable="true" role="textbox" aria-label="Disposable conversation" style="width:500px;min-height:100px;border:1px solid #aaa">editable: SELECT :end</div></label><button id="neutral" type="button">Non-input focus</button><button type="submit">Synthetic submit</button></form><script>window.submitCount=0;window.enterCount=0;window.inputCounts={textarea:0,editable:0};window.models={};for(const id of ['textarea','editable']){const element=document.getElementById(id);const read=()=>id==='textarea'?element.value:element.textContent;window.models[id]=read();element.addEventListener('input',()=>{window.inputCounts[id]++;window.models[id]=read()})}document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();window.submitCount++});document.addEventListener('keydown',event=>{if(event.key==='Enter')window.enterCount++});</script></body></html>`;
  await writeFile(fixturePath, `const { app, BrowserWindow } = require('electron');\nconst { mkdirSync } = require('node:fs');\nconst profile = ${JSON.stringify(join(dataRoot, 'target-profile'))};\nmkdirSync(profile, { recursive: true });\nfor (const key of ['userData', 'sessionData', 'crashDumps']) app.setPath(key, profile);\napp.setAppLogsPath(profile);\napp.commandLine.appendSwitch('disable-breakpad');\napp.setName('Typeless Delivery Fixture');\napp.whenReady().then(async () => {\n${enableTargetAccessibility ? 'app.setAccessibilitySupportEnabled(true);' : ''}\nconst window = new BrowserWindow({ width: 720, height: 440, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });\nawait window.loadURL(${JSON.stringify('data:text/html;charset=utf-8,' + encodeURIComponent(fixtureHtml))});\nwindow.show(); window.focus();\n});\napp.on('window-all-closed', () => app.quit());\n`);
  stage(`launch independent target; explicit accessibility=${enableTargetAccessibility}`);
  fixture = await launch({ args: [fixturePath], env: environment });
  const targetPage = await fixture.firstWindow();
  await targetPage.locator('#textarea').waitFor();
  await app.evaluate(({ BrowserWindow }) => {
    globalThis.__deliveryMainFocusCount = 0;
    const main = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#default'));
    main.hide(); main.on('focus', () => { globalThis.__deliveryMainFocusCount++; });
  });
  const overlayPage = await until(() => Promise.resolve(app.windows().find(page => page.url().endsWith('#overlay'))), Boolean, 'Overlay renderer was not found.');
  await overlayPage.emulateMedia({ reducedMotion: 'no-preference' });
  await mainPage.evaluate(() => { window.__deliveryTrace = []; window.typeless.subscribe(({ session }) => { const last = window.__deliveryTrace.at(-1); if (!last || last.status !== session.status || last.delivery !== session.delivery) window.__deliveryTrace.push({ status: session.status, delivery: session.delivery }); }); });
  clipboardStaged = true;
  await app.evaluate(async ({ clipboard, ClipboardItem }, expected) => {
    const original = await Promise.all((await clipboard.read()).map(async item => {
      const entries = await Promise.all(item.types.map(async type => {
        const nativeHtmlFormat = 'electron application/osclipboard;format="public.html"';
        if (process.platform === 'darwin' && type === 'text/html') {
          if (item.types.includes(nativeHtmlFormat)) return undefined;
          return [nativeHtmlFormat, await item.getType(type)];
        }
        return [type, await item.getType(type)];
      }));
      return new ClipboardItem(Object.fromEntries(entries.filter(Boolean)));
    }));
    const ownerFormat = 'electron application/osclipboard;format="dev.typeless.owner"';
    const originalWrite = clipboard.write.bind(clipboard);
    const owned = new Map();
    let writes = Promise.resolve();
    globalThis.__deliveryClipboardWriteCount = 0;
    let closing = false;
    let restored = false;
    clipboard.write = items => {
      const operation = writes.then(async () => {
        if (closing) throw new Error('Test clipboard cleanup has started.');
        const marked = items.find(item => item.types.includes(ownerFormat) && item.types.includes('text/plain'));
        const owner = marked ? await (await marked.getType(ownerFormat)).text() : undefined;
        const text = marked ? await (await marked.getType('text/plain')).text() : undefined;
        await originalWrite(items);
        globalThis.__deliveryClipboardWriteCount++;
        if (owner && text === expected) owned.set(owner, text);
      });
      writes = operation.catch(() => {});
      return operation;
    };
    globalThis.__restoreDeliveryClipboard = async () => {
      if (restored) return 'restored';
      closing = true;
      await writes;
      const current = await clipboard.read();
      const marked = current.find(item => item.types.includes(ownerFormat));
      if (!marked) return 'skipped-new-content';
      const owner = await (await marked.getType(ownerFormat)).text();
      const text = await clipboard.readText();
      if (owned.get(owner) !== text) return 'skipped-new-content';
      if (original.length) await originalWrite(original); else clipboard.clear();
      owned.clear();
      restored = true;
      return 'restored';
    };
  }, utterance);
  for (const field of ['none', 'textarea', 'editable']) {
    stage(field === 'none' ? 'dictate without an input field' : `dictate into external ${field}`);
    if (field !== 'none') {
      await until(async () => { await dispatch({ type: 'permissions.refresh' }); return (await snapshot()).permissions; }, permissions => permissions.nativeAvailable, 'Native helper is unavailable.', 5000).catch(() => {});
      const permissions = (await snapshot()).permissions;
      if (!permissions.nativeAvailable || !permissions.accessibility) throw new Blocked('Recording and clipboard checks passed without an input field; actual paste verification requires existing native permissions. No permission was requested.');
    }
    const requestsBefore = requests.length;
    await fixture.evaluate(({ app, BrowserWindow }) => { app.focus({ steal: true }); const target = BrowserWindow.getAllWindows()[0]; target.show(); target.focus(); });
    await targetPage.evaluate(field => {
      if (field === 'none') { document.getElementById('neutral').focus(); return; }
      const element = document.getElementById(field); element.focus();
      const value = field === 'textarea' ? element.value : element.textContent;
      const start = value.indexOf('SELECT');
      if (field === 'textarea') element.setSelectionRange(start, start + 6);
      else { const range = document.createRange(); range.setStart(element.firstChild, start); range.setEnd(element.firstChild, start + 6); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
    }, field);
    await until(() => fixture.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFocused()), Boolean, 'Disposable target did not acquire native focus.');
    // Bridge evaluation does not bring Typeless to the foreground. This is the same action as Fn.
    const started = await dispatch({ type: 'dictation.toggle' });
    assert.equal(started.ok, true, started.message);
    await until(async () => assertCaptureStarted(await snapshot()), state => state.session.status === 'recording' && state.session.durationMs >= 600 && state.session.level > 0.016, 'Fake audio did not reach recording readiness.');
    const recordingWindow = (await nativeWindows()).find(window => window.url.endsWith('#overlay'));
    assert.deepEqual({ width: recordingWindow.bounds.width, height: recordingWindow.bounds.height }, { width: 240, height: 76 });
    assert.equal(recordingWindow.visible, true); assert.equal(recordingWindow.focusable, false);
    const workArea = await app.evaluate(({ screen }, bounds) => screen.getDisplayMatching(bounds).workArea, recordingWindow.bounds);
    assert.equal(recordingWindow.bounds.x, Math.round(workArea.x + (workArea.width - 240) / 2));
    assert.equal(recordingWindow.bounds.y, Math.round(workArea.y + workArea.height - 76 - 16));
    await overlayPage.locator('.voice-pill .wave').waitFor({ state: 'visible' });
    assert.equal(await overlayPage.locator('.voice-pill button').count(), 2);
    if (field === 'textarea') { screenshots.recording = join(dataRoot, 'recording.png'); await overlayPage.screenshot({ path: screenshots.recording, omitBackground: true }); }
    if (field === 'textarea') {
      await overlayPage.locator('.voice-pill').hover();
      screenshots.recordingControls = join(dataRoot, 'recording-controls.png');
      await overlayPage.screenshot({ path: screenshots.recordingControls, omitBackground: true });
      await overlayPage.getByRole('button', { name: '完成听写', exact: true }).click();
      assert.equal(await fixture.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFocused()), true, 'Clicking the completion control stole foreground focus.');
    } else assert.equal((await dispatch({ type: 'dictation.toggle' })).ok, true);
    await overlayPage.locator('.voice-loading').waitFor({ state: 'visible', timeout: 5000 });
    const animation = await overlayPage.locator('.voice-loading i').first().evaluate(element => ({ name: getComputedStyle(element).animationName, duration: getComputedStyle(element).animationDuration }));
    assert.notEqual(animation.name, 'none'); assert.notEqual(animation.duration, '0s');
    assert.equal(await overlayPage.locator('.voice-pill button').count(), 1, 'Processing keeps only the cancel control.');
    if (field === 'textarea') { screenshots.processing = join(dataRoot, 'processing.png'); await overlayPage.screenshot({ path: screenshots.processing, omitBackground: true }); }
    assert.equal((await nativeWindows()).find(window => window.url.endsWith('#default')).focused, false);
    const completed = await until(snapshot, state => state.session.status === 'ready' || state.session.status === 'error', 'Delivery did not finish.');
    assert.equal(completed.session.status, 'ready', completed.session.error);
    assert.equal(completed.session.copied, true, 'The completed result was not copied.');
    assert.equal(await app.evaluate(async ({ clipboard }) => clipboard.readText()), utterance);
    assert.equal(requests.length - requestsBefore, 2, 'Expected both recognition and cleanup HTTP requests.');
    await until(nativeWindows, windows => !windows.find(window => window.url.endsWith('#overlay')).visible, 'Overlay did not hide after copying.');
    if (field === 'none') {
      assert.ok(['copied', 'confirmed', 'dispatched'].includes(completed.session.delivery));
      assert.deepEqual(await targetPage.evaluate(() => ({ textarea: document.getElementById('textarea').value, editable: document.getElementById('editable').textContent, submits: window.submitCount, enters: window.enterCount })), { textarea: 'textarea: SELECT :end', editable: 'editable: SELECT :end', submits: 0, enters: 0 });
      await pause(1300);
      assert.equal(await app.evaluate(async ({ clipboard }) => clipboard.readText()), utterance, 'Clipboard must retain the new transcript.');
      checks.push({ field, recordingWithoutInput: true, httpRequests: 2, copied: true, clipboardRetained: true, overlayHidden: true, delivery: completed.session.delivery });
      continue;
    }
    if (completed.session.delivery === 'copied' && ['accessibility_denied', 'permission_denied', 'permission_required', 'helper_unavailable', 'native_timeout'].includes(completed.session.errorCode)) throw new Blocked(`Clipboard succeeded; paste verification is blocked by ${completed.session.errorCode}. No permission was requested.`);
    assert.ok(['confirmed', 'dispatched'].includes(completed.session.delivery), `Native paste failed: ${completed.session.errorCode || ''} ${completed.session.warning || ''}`);
    const expected = `${field}: ${utterance} :end`;
    const fieldText = () => targetPage.locator(`#${field}`).evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.textContent);
    await until(fieldText, value => value === expected, `Native ${field} contents did not match the delivered output.`);
    const inputState = await until(() => targetPage.evaluate(field => ({ value: window.models[field], events: window.inputCounts[field] }), field), state => state.value === expected && state.events > 0, `Native ${field} delivery changed the DOM without updating the input-event-driven model.`);
    await until(nativeWindows, windows => !windows.find(window => window.url.endsWith('#overlay')).visible, 'Overlay did not hide after delivery.');
    await pause(1300);
    assert.equal(await fieldText(), expected, 'Delivery changed or duplicated after completion.');
    const clipboardRetained = await app.evaluate(async ({ clipboard }, expected) => await clipboard.readText() === expected, utterance);
    assert.equal(clipboardRetained, true, 'Production clipboard must retain the completed transcript.');
    clipboardDiagnostics.push({ field, transcriptRetained: clipboardRetained });
    assert.deepEqual(await targetPage.evaluate(() => ({ submits: window.submitCount, enters: window.enterCount })), { submits: 0, enters: 0 });
    assert.equal(await app.evaluate(() => globalThis.__deliveryMainFocusCount), 0, 'Typeless stole focus during delivery.');
    assert.equal(await fixture.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFocused()), true);
    checks.push({ field, finishControl: field === 'textarea' ? 'overlay-button' : 'shortcut-action', delivery: completed.session.delivery, actualContentsVerified: true, inputEvents: inputState.events, modelValueVerified: true, clipboardRetained, noSubmit: true, overlayHidden: true, mainFocusCount: 0 });
  }
  stage('explicit raw copy never pastes even with automatic paste enabled');
  const beforeRawCopy = await targetPage.evaluate(() => ({ models: { ...window.models }, counts: { ...window.inputCounts }, submits: window.submitCount, enters: window.enterCount }));
  const beforeRawSession = (await snapshot()).session;
  const rawCopyWrites = await app.evaluate(() => globalThis.__deliveryClipboardWriteCount);
  assert.equal((await dispatch({ type: 'dictation.copy', source: 'raw' })).ok, true);
  await pause(350);
  assert.equal(await app.evaluate(() => globalThis.__deliveryClipboardWriteCount), rawCopyWrites + 1);
  assert.equal(await app.evaluate(async ({ clipboard }) => clipboard.readText()), beforeRawSession.rawText);
  assert.equal((await snapshot()).session.text, beforeRawSession.text);
  assert.deepEqual(await targetPage.evaluate(() => ({ models: { ...window.models }, counts: { ...window.inputCounts }, submits: window.submitCount, enters: window.enterCount })), beforeRawCopy);
  checks.push({ action: 'raw-copy-with-auto-paste-enabled', clipboardWrites: 1, editorChanges: 0, resultRetained: true });

  stage('cancel processing from the overlay without copy or paste');
  const beforeCancelWrites = await app.evaluate(() => globalThis.__deliveryClipboardWriteCount);
  const beforeCancelEditor = await targetPage.evaluate(() => ({ models: { ...window.models }, counts: { ...window.inputCounts }, submits: window.submitCount, enters: window.enterCount }));
  assert.equal((await dispatch({ type: 'dictation.toggle' })).ok, true);
  await until(async () => assertCaptureStarted(await snapshot()), state => state.session.status === 'recording' && state.session.durationMs >= 600 && state.session.level > 0.016, 'Cancellation fixture audio did not start.');
  const beforeCancelRequests = requests.length;
  assert.equal((await dispatch({ type: 'dictation.toggle' })).ok, true);
  await until(() => Promise.resolve(requests.length), count => count > beforeCancelRequests, 'Cancellation fixture did not begin its delayed HTTP request.');
  await overlayPage.locator('.voice-pill').hover();
  screenshots.processingControls = join(dataRoot, 'processing-controls.png');
  await overlayPage.screenshot({ path: screenshots.processingControls, omitBackground: true });
  await overlayPage.getByRole('button', { name: '取消听写', exact: true }).click();
  await until(snapshot, state => state.session.status === 'cancelled', 'Overlay cancellation did not reach the session.');
  await pause(1500);
  assert.equal((await snapshot()).session.status, 'cancelled');
  assert.equal(await app.evaluate(() => globalThis.__deliveryClipboardWriteCount), beforeCancelWrites, 'Cancelled processing wrote to the clipboard.');
  assert.equal(await app.evaluate(async ({ clipboard }) => clipboard.readText()), utterance);
  assert.deepEqual(await targetPage.evaluate(() => ({ models: { ...window.models }, counts: { ...window.inputCounts }, submits: window.submitCount, enters: window.enterCount })), beforeCancelEditor, 'Cancelled processing delivered input to the editor.');
  assert.equal(requests.length - beforeCancelRequests, 1, 'Cancelled recognition must not request cleanup.');
  await until(nativeWindows, windows => !windows.find(window => window.url.endsWith('#overlay')).visible, 'Cancelled overlay did not hide.');
  assert.equal(await fixture.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFocused()), true);
  assert.equal(await app.evaluate(() => globalThis.__deliveryMainFocusCount), 0);
  checks.push({ action: 'overlay-processing-cancel', lateResponseFenced: true, clipboardWrites: 0, editorChanges: 0, noSubmit: true, overlayHidden: true, mainFocusCount: 0 });
  screenshots.target = join(dataRoot, 'target-final.png'); await targetPage.screenshot({ path: screenshots.target });
  const trace = await mainPage.evaluate(() => window.__deliveryTrace);
  assert.ok(trace.some(event => event.status === 'inserting' && event.delivery === 'pending'));
  receipt = { ok: true, status: 'passed', checks, screenshots, clipboardDiagnostics, requests, explicitTargetAccessibility: enableTargetAccessibility, dataRoot, limitations: 'Native system paste and editor contents are real. No-input recording and retained clipboard output are checked separately. Audio, providers and credential encryption are simulated; physical Fn, a real microphone, live ASR, other editors and OS versions remain unverified.' };
} catch (error) {
  receipt = { ok: false, status: error instanceof Blocked ? 'blocked' : 'failed', stage: currentStage, error: error instanceof Error ? error.message : String(error), checks, screenshots, clipboardDiagnostics, requests, explicitTargetAccessibility: enableTargetAccessibility, dataRoot };
  process.exitCode = error instanceof Blocked ? 3 : 1;
} finally {
  if (clipboardStaged) {
    await dispatch({ type: 'dictation.cancel' }).catch(() => {});
    await pause(1300);
    receipt.clipboardRecovery = await restoreClipboard();
  }
  await closeInstances();
  clearTimeout(cleanupDeadline); clearTimeout(deadline); server.closeAllConnections();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  await rm(fixturePath, { force: true });
  await writeFile(join(dataRoot, 'result.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
}
