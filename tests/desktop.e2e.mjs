import { _electron as electron, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

// Exercises actual Electron IPC and HTTP with fake audio, fake keys and test-only crypto.
// No production provider, real microphone, keychain item or OS permission setting is used.
const root = resolve('.');
await mkdir(join(root, '.local'), { recursive: true });
const dataRoot = await mkdtemp(join(root, '.local', 'desktop-e2e-'));
const requests = [];
let slow = false;
const server = createServer(async (request, response) => {
  let raw = '';
  try { for await (const chunk of request) { raw += chunk; if (raw.length > 10000000) { response.writeHead(413).end(); return; } } } catch { return; }
  const body = raw ? JSON.parse(raw) : undefined;
  requests.push({ path: request.url, headers: request.headers, body });
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/v1/models') { response.end(JSON.stringify({ data: [{ id: 'mimo-v2.5-asr' }, { id: 'test-cleanup' }] })); return; }
  if (request.url !== '/v1/chat/completions') { response.writeHead(404).end('{}'); return; }
  const isAudio = body.model === 'mimo-v2.5-asr';
  const text = isAudio ? '嗯，下周三下午三点开会。' : body.messages[0].content.includes('Translate to') ? 'Meet next Wednesday at three in the afternoon.' : '下周三下午三点开会。';
  const finish = () => { if (!response.destroyed) response.end(JSON.stringify({ id: 'test-request', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: text } }] })); };
  if (slow && isAudio) setTimeout(finish, 1500); else finish();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
let app;
let activeInstance;
const hardDeadline = setTimeout(() => {
  console.error(JSON.stringify({ error: 'Electron E2E exceeded its 90-second wall deadline.', dataRoot }));
  activeInstance?.process().kill('SIGKILL');
  server.closeAllConnections();
  process.exit(2);
}, 90000);
const cleanupDeadline = setTimeout(() => { void closeInstance(activeInstance); }, 84000);
function stage(name) { console.log(`[e2e] ${name}`); }
async function closeInstance(instance) {
  if (!instance) return;
  let timer;
  try {
    await Promise.race([(async () => {
      const page = instance.windows().find(candidate => candidate.url().endsWith('#default'));
      await page?.evaluate(() => window.typeless?.dispatch({ type: 'dictation.cancel' })).catch(() => {});
      await instance.evaluate(async () => { await globalThis.__restoreDesktopTestClipboard?.(); }).catch(() => {});
      await instance.close();
    })(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Close timed out')), 5000); })]);
  } catch { instance.process().kill('SIGKILL'); }
  finally { clearTimeout(timer); }
}
async function launch() {
  stage('launch');
  const env = { ...process.env, TYPELESS_DATA_DIR: dataRoot, ELECTRON_ENABLE_LOGGING: '0' };
  delete env.ELECTRON_RUN_AS_NODE; delete env.VITE_DEV_SERVER_URL;
  const instance = await electron.launch({ executablePath: process.env.TYPELESS_EXECUTABLE || undefined, args: [...(process.env.TYPELESS_EXECUTABLE ? [] : [root]), '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], env, timeout: 30000 });
  activeInstance = instance;
  instance.process().stderr?.on('data', chunk => process.stderr.write(`[electron stderr] ${chunk}`));
  instance.process().stdout?.on('data', chunk => process.stdout.write(`[electron stdout] ${chunk}`));
  await instance.evaluate(async ({ safeStorage, clipboard, ClipboardItem }) => {
    const nativeHtmlFormat = 'electron application/osclipboard;format="public.html"';
    const ownerFormat = 'electron application/osclipboard;format="dev.typeless.owner"';
    const originals = await Promise.all((await clipboard.read()).map(async item => {
      const entries = await Promise.all(item.types.map(async type => {
        if (process.platform === 'darwin' && type === 'text/html') {
          if (item.types.includes(nativeHtmlFormat)) return undefined;
          return [nativeHtmlFormat, await item.getType(type)];
        }
        return [type, await item.getType(type)];
      }));
      return new ClipboardItem(Object.fromEntries(entries.filter(Boolean)));
    }));
    const syntheticTexts = new Set(['嗯，下周三下午三点开会。', '下周三下午三点开会。', 'Meet next Wednesday at three in the afternoon.']);
    const owned = new Map();
    const originalWrite = clipboard.write.bind(clipboard);
    let writes = Promise.resolve();
    let closing = false;
    clipboard.write = items => {
      const operation = writes.then(async () => {
        if (closing) throw new Error('Test clipboard cleanup has started.');
        const marked = items.find(item => item.types.includes(ownerFormat) && item.types.includes('text/plain'));
        const owner = marked ? await (await marked.getType(ownerFormat)).text() : undefined;
        const text = marked ? await (await marked.getType('text/plain')).text() : undefined;
        await originalWrite(items);
        if (owner && syntheticTexts.has(text)) owned.set(owner, text);
      });
      writes = operation.catch(() => {});
      return operation;
    };
    globalThis.__restoreDesktopTestClipboard = async () => {
      closing = true;
      await writes;
      const current = await clipboard.read();
      const marked = current.find(item => item.types.includes(ownerFormat));
      if (!marked) return;
      const owner = await (await marked.getType(ownerFormat)).text();
      const text = await clipboard.readText();
      if (owned.get(owner) !== text) return;
      if (originals.length) await originalWrite(originals); else clipboard.clear();
      owned.clear();
    };

    safeStorage.isEncryptionAvailable = () => true;
    safeStorage.encryptString = value => Buffer.from(`TEST-ONLY:${value}`);
    safeStorage.decryptString = buffer => buffer.toString().replace(/^TEST-ONLY:/, '');
  });
  const diagnostics = [];
  instance.on('window', page => {
    page.on('console', message => diagnostics.push(`console: ${message.type()} ${message.text()}`));
    page.on('pageerror', error => diagnostics.push(`pageerror: ${error.message}`));
  });
  let page;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      page = instance.windows().find(candidate => candidate.url().endsWith('#default'));
      if (page) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!page) throw new Error(`Main window not found: ${instance.windows().map(page => page.url()).join(', ')}`);
    page.on('console', message => diagnostics.push(`console: ${message.type()} ${message.text()}`));
    page.on('pageerror', error => diagnostics.push(`pageerror: ${error.message}`));
    await page.waitForFunction(() => Boolean(window.typeless), undefined, { timeout: 15000 });
    await page.getByRole('navigation', { name: '主导航', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.evaluate(() => {
      window.__typelessTrace = [];
      window.typeless.subscribe(value => {
        const previous = window.__typelessTrace.at(-1);
        if (!previous || previous.id !== value.session.id || previous.status !== value.session.status || previous.rawLength !== value.session.rawText.length) {
          window.__typelessTrace.push({ id: value.session.id, status: value.session.status, rawLength: value.session.rawText.length, textLength: value.session.text.length, durationMs: value.session.durationMs, error: value.session.error, warning: value.session.warning });
          if (window.__typelessTrace.length > 100) window.__typelessTrace.shift();
        }
      });
    });
    return { instance, page };
  } catch (error) {
    const windows = [];
    for (const [index, candidate] of instance.windows().entries()) {
      windows.push({ url: candidate.url(), body: await candidate.locator('body').innerText().catch(() => ''), bridge: await candidate.evaluate(() => Boolean(window.typeless)).catch(() => false) });
      await candidate.screenshot({ path: join(dataRoot, `failure-${index}.png`) }).catch(() => {});
    }
    console.error(JSON.stringify({ diagnostics, windows, dataRoot }, null, 2));
    await closeInstance(instance);
    throw error;
  }
}
const dispatch = (page, action) => page.evaluate(action => window.typeless.dispatch(action), action);
const snapshot = page => page.evaluate(() => window.typeless.getSnapshot());
async function waitStatus(page, status) {
  const deadline = Date.now() + 15000;
  let current;
  while (Date.now() < deadline) {
    current = await snapshot(page);
    if (current.session.status === status) return current;
    if (current.session.status === 'error' && status !== 'error') break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.error('[e2e] status timeout:', { expected: status, actual: current?.session.status, error: current?.session.error, warning: current?.session.warning, microphone: current?.permissions.microphone });
  assert.equal(current?.session.status, status, `Expected ${status}; received ${current?.session.status}: ${current?.session.error || ''}`);
  return current;
}
async function record(page, mode = 'dictate') {
  assert.equal((await dispatch(page, { type: 'dictation.toggle', practice: true, mode })).ok, true);
  const started = await waitStatus(page, 'recording');
  const deadline = Date.now() + 10000;
  let ready = false;
  while (Date.now() < deadline) {
    const current = await snapshot(page);
    assert.equal(current.session.id, started.session.id, 'Recording session unexpectedly changed.');
    assert.equal(current.session.status, 'recording', current.session.error || 'Recording ended before audio was captured.');
    if (current.session.durationMs >= 500 && current.session.level > 0.016) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'The fake microphone produced no qualifying audio samples within 10 seconds.');
  assert.equal((await dispatch(page, { type: 'dictation.toggle' })).ok, true);
}

try {
  let launched = await launch(); app = launched.instance; let page = launched.page;
  await mkdir(join(root, 'docs', 'screenshots'), { recursive: true });
  await page.screenshot({ path: join(root, 'docs', 'screenshots', 'desktop-onboarding.png') });
  stage('missing credentials');
  const missing = await dispatch(page, { type: 'dictation.toggle', practice: true });
  assert.equal(missing.ok, false); assert.match(missing.message, /API key/);
  assert.equal(requests.length, 0);
  stage('polishing levels through settings UI');
  const openWriting = async () => {
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('tab', { name: '文字整理', exact: true }).click();
  };
  const saveLevel = async (value, enabled, strength) => {
    await page.getByLabel('润色程度').selectOption(value);
    await page.getByRole('button', { name: '保存设置', exact: true }).click();
    await page.waitForFunction(async expected => {
      const { settings } = await window.typeless.getSnapshot();
      return settings.cleanup.enabled === expected.enabled && settings.writing.strength === expected.strength;
    }, { enabled, strength });
    await expect(page.getByRole('button', { name: '保存设置', exact: true })).toBeDisabled();
  };
  await openWriting();
  await saveLevel('none', false, 'balanced');
  await page.getByRole('button', { name: '语音输入', exact: true }).click();
  await page.locator('.home-disclosure').filter({ has: page.locator('summary', { hasText: /^文字整理$/ }) }).locator('summary').click();
  await page.getByLabel('粘贴文字，试试整理效果').fill('嗯，下周三下午三点开会。');
  const beforeRaw = requests.length;
  await page.getByRole('button', { name: '复制原文', exact: true }).click();
  const rawOnly = await waitStatus(page, 'ready');
  assert.equal(rawOnly.session.text, '嗯，下周三下午三点开会。');
  assert.equal(rawOnly.session.copied, true);
  assert.equal(requests.length, beforeRaw, 'No-polish text processing must not call HTTP providers.');
  await openWriting();
  await saveLevel('light', true, 'light');
  await saveLevel('strong', true, 'balanced');
  await page.screenshot({ path: join(root, 'docs', 'screenshots', 'writing-settings.png') });
  await page.getByRole('tab', { name: '声音与快捷键', exact: true }).click();
  await page.getByText(/^主要快捷键：/).waitFor();
  await page.getByText(/^备用快捷键：/).waitFor();
  await page.screenshot({ path: join(root, 'docs', 'screenshots', 'shortcut-settings.png') });
  await page.getByRole('button', { name: '语音输入', exact: true }).click();
  stage('save provider settings');
  const saved = await dispatch(page, { type: 'settings.save', patch: {
    asr: { kind: 'mimo', baseUrl, model: 'mimo-v2.5-asr' }, cleanup: { enabled: true, baseUrl, model: 'test-cleanup' },
    privacy: { historyEnabled: true, retentionDays: 1, memoryEnabled: true }, general: { onboardingComplete: true, autoInsert: false },
  }, secrets: { asr: 'FAKE-ASR-KEY', cleanup: 'FAKE-TEXT-KEY' } });
  assert.equal(saved.ok, true, saved.message);
  assert.equal(JSON.stringify(await snapshot(page)).includes('FAKE-'), false);
  assert.equal((await dispatch(page, { type: 'provider.test', provider: 'asr' })).ok, true);
  await dispatch(page, { type: 'dictionary.save', entry: { id: 'global-term', term: 'MiMo', replacement: 'MiMo', description: 'brand', scope: '*' } });
  await dispatch(page, { type: 'dictionary.save', entry: { id: 'other-term', term: 'SCOPED-SECRET', replacement: '', description: '', scope: 'OtherApp' } });
  await dispatch(page, { type: 'memory.save', entry: { id: 'global-memory', content: 'Use concise phrasing.', scope: '*', enabled: true, source: 'manual', createdAt: '' } });
  await dispatch(page, { type: 'memory.save', entry: { id: 'disabled-memory', content: 'DISABLED-SECRET', scope: '*', enabled: false, source: 'manual', createdAt: '' } });
  stage('fake microphone dictation');
  await record(page);
  let current = await waitStatus(page, 'ready');
  assert.equal(current.session.rawText, '嗯，下周三下午三点开会。'); assert.equal(current.session.text, '下周三下午三点开会。');
  assert.equal(current.history.length, 1); assert.equal(current.session.inserted, false);
  await page.screenshot({ path: join(root, 'docs', 'screenshots', 'desktop-result.png') });
  const asr = requests.find(item => item.body?.model === 'mimo-v2.5-asr');
  assert.equal(asr.headers['api-key'], 'FAKE-ASR-KEY'); assert.match(asr.body.messages[0].content[0].input_audio.data, /^data:audio\/wav;base64,UklGR/);
  const polish = requests.find(item => item.body?.model === 'test-cleanup');
  assert.equal(polish.headers.authorization, 'Bearer FAKE-TEXT-KEY');
  assert.ok(JSON.stringify(polish.body).includes('MiMo')); assert.ok(JSON.stringify(polish.body).includes('Use concise phrasing.'));
  assert.ok(!JSON.stringify(polish.body).includes('SCOPED-SECRET')); assert.ok(!JSON.stringify(polish.body).includes('DISABLED-SECRET'));
  stage('translation');
  await record(page, 'translate'); current = await waitStatus(page, 'ready');
  assert.match(current.session.text, /^Meet next Wednesday/); assert.equal(current.history.length, 2);
  stage('cancellation');
  slow = true; await record(page); await waitStatus(page, 'transcribing');
  await dispatch(page, { type: 'dictation.cancel' }); await page.waitForTimeout(1800); current = await snapshot(page);
  assert.equal(current.session.status, 'cancelled'); assert.equal(current.history.length, 2); slow = false;
  const dictionary = await dispatch(page, { type: 'dictionary.export' }); assert.match(dictionary.text, /MiMo/);
  const history = await dispatch(page, { type: 'history.export' }); assert.equal(JSON.parse(history.text).length, 2);
  await mkdir(join(root, 'docs', 'screenshots'), { recursive: true });
  await page.screenshot({ path: join(root, 'docs', 'screenshots', 'desktop-home.png') });
  stage('restart persistence');
  await closeInstance(app); app = undefined;
  launched = await launch(); app = launched.instance; page = launched.page;
  current = await snapshot(page); assert.equal(current.history.length, 2); assert.equal(current.dictionary.length, 2); assert.equal(current.memories.length, 2); assert.equal(current.settings.asr.hasApiKey, true);
  assert.equal(current.settings.cleanup.enabled, true); assert.equal(current.settings.writing.strength, 'balanced');
  await openWriting();
  assert.equal(await page.getByLabel('润色程度').inputValue(), 'strong');
  assert.equal((await dispatch(page, { type: 'provider.test', provider: 'asr' })).ok, true);
  await dispatch(page, { type: 'settings.save', patch: { asr: { baseUrl: 'http://localhost:9/v1' } } });
  current = await snapshot(page); assert.equal(current.settings.asr.hasApiKey, false); assert.equal(current.settings.cleanup.hasApiKey, true);
  await dispatch(page, { type: 'history.clear' }); assert.equal((await snapshot(page)).history.length, 0);
  const disk = await readFile(join(dataRoot, 'settings', 'state.json'), 'utf8');
  assert.ok(!disk.includes('FAKE-ASR-KEY')); assert.ok(!disk.includes('FAKE-TEXT-KEY'));
  console.log(JSON.stringify({ ok: true, checks: ['polishing-levels-ui-persistence', 'no-polish-original-without-http', 'separate-shortcut-status', 'real-preload-ipc', 'fake-microphone-wav', 'mimo-http', 'cleanup-http', 'translation', 'cancel-late-response', 'missing-credentials', 'scope-filtering', 'history-export-clear', 'restart-persistence', 'credential-origin-revocation'], providerRequests: requests.length, dataRoot, screenshot: 'docs/screenshots/desktop-home.png', limitations: 'HTTP providers and secure storage are test doubles. No live provider, real microphone or external insertion was tested.' }, null, 2));
} catch (error) {
  console.error('[e2e] original failure:', error);
  const debugPage = activeInstance?.windows().find(candidate => candidate.url().endsWith('#default'));
  if (debugPage) {
    const state = await snapshot(debugPage).catch(() => undefined);
    console.error('[e2e] failure diagnostics:', JSON.stringify({ session: state?.session, requests: requests.map(item => ({ path: item.path, model: item.body?.model })), trace: await debugPage.evaluate(() => window.__typelessTrace).catch(() => []) }, null, 2));
  }
  throw error;
} finally {
  if (activeInstance) await closeInstance(activeInstance);
  clearTimeout(cleanupDeadline); clearTimeout(hardDeadline);
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
