import { _electron as electron, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

// Exercises actual Electron IPC and HTTP with fake audio, fake keys and test-only crypto.
// No production provider, real microphone, keychain item or OS permission setting is used.
const root = resolve('.');
await mkdir(join(root, '.local'), { recursive: true });
const dataRoot = await mkdtemp(join(root, '.local', 'desktop-e2e-'));
const requests = [];
let slow = false;
// A fake newer release served by the same loopback server drives the update stage; its requests are not provider traffic.
const updatePayload = Buffer.from('fake installer bytes for the update stage '.repeat(64));
const updateDigest = `sha256:${createHash('sha256').update(updatePayload).digest('hex')}`;
const updateAssets = origin => ['Typeless-99.0.0-arm64.dmg', 'Typeless-99.0.0-x64.dmg', 'Typeless-99.0.0-win.zip'].map(name => ({ name, browser_download_url: `${origin}/download/${name}`, size: updatePayload.length, digest: updateDigest }));
const server = createServer(async (request, response) => {
  if (request.url === '/releases/latest') { const origin = `http://${request.headers.host}`; response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ tag_name: 'v99.0.0', html_url: 'https://github.com/gaojunbin/Typeless/releases/tag/v99.0.0', assets: updateAssets(origin) })); return; }
  if (request.url?.startsWith('/download/')) { response.setHeader('Content-Type', 'application/octet-stream'); response.setHeader('Content-Length', String(updatePayload.length)); response.end(updatePayload); return; }
  let raw = '';
  try { for await (const chunk of request) { raw += chunk; if (raw.length > 10000000) { response.writeHead(413).end(); return; } } } catch { return; }
  const body = raw ? JSON.parse(raw) : undefined;
  requests.push({ path: request.url, headers: request.headers, body });
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/v1/models') { response.end(JSON.stringify({ data: [{ id: 'mimo-v2.5-asr' }, { id: 'test-cleanup' }] })); return; }
  if (request.url !== '/v1/chat/completions') { response.writeHead(404).end('{}'); return; }
  const isAudio = body.model === 'mimo-v2.5-asr';
  const text = isAudio ? '嗯，下周三下午三点开会。' : '下周三下午三点开会。';
  const finish = () => { if (!response.destroyed) response.end(JSON.stringify({ id: 'test-request', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: text } }] })); };
  if (slow && isAudio) setTimeout(finish, 1500); else finish();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
let app;
let activeInstance;
const hardDeadline = setTimeout(() => {
  console.error(JSON.stringify({ error: 'Electron E2E exceeded its 150-second wall deadline.', dataRoot }));
  activeInstance?.process().kill('SIGKILL');
  server.closeAllConnections();
  process.exit(2);
}, 150000);
const cleanupDeadline = setTimeout(() => { void closeInstance(activeInstance); }, 144000);
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
  const env = { ...process.env, TYPELESS_DATA_DIR: dataRoot, ELECTRON_ENABLE_LOGGING: '0', TYPELESS_UPDATE_URL: `${baseUrl.replace(/\/v1$/, '')}/releases/latest` };
  delete env.ELECTRON_RUN_AS_NODE; delete env.VITE_DEV_SERVER_URL;
  const instance = await electron.launch({ executablePath: process.env.TYPELESS_EXECUTABLE || undefined, args: [...(process.env.TYPELESS_EXECUTABLE ? [] : [root]), '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], env, timeout: 30000 });
  activeInstance = instance;
  instance.process().stderr?.on('data', chunk => process.stderr.write(`[electron stderr] ${chunk}`));
  instance.process().stdout?.on('data', chunk => process.stdout.write(`[electron stdout] ${chunk}`));
  await instance.evaluate(async ({ safeStorage, clipboard, ClipboardItem, systemPreferences }) => {
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
    const syntheticTexts = new Set(['嗯，下周三下午三点开会。', '下周三下午三点开会。']);
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

    // Chromium serves fake audio without a device, but the setup guide gates its microphone step on
    // the OS permission status. Reporting it as granted keeps the meter check out of the TCC prompt.
    systemPreferences.getMediaAccessStatus = () => 'granted';
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
    // A fresh profile opens the setup guide; a completed profile opens the shell directly.
    await page.locator('main.onboarding[aria-label="设置向导"], nav[aria-label="主导航"] [role="tablist"]').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.evaluate(() => window.typeless.dispatch({ type: 'permissions.refresh' }));
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
const capture = (page, name) => page.screenshot({ path: join(dataRoot, `${name}.png`), animations: 'disabled' });
const setupCards = process.platform === 'darwin' ? ['microphone', 'accessibility'] : process.platform === 'win32' ? ['microphone', 'helper'] : ['microphone'];
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
async function record(page) {
  assert.equal((await dispatch(page, { type: 'dictation.toggle' })).ok, true);
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
  const openTab = name => page.getByRole('tab', { name, exact: true }).click();
  const shell = () => page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('tablist');
  const guide = () => page.locator('main.onboarding[aria-label="设置向导"]');
  const setupStep = () => page.locator('nav[aria-label="设置进度"] li[aria-current="step"]');

  stage('a fresh profile opens the setup guide instead of the shell');
  await guide().waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.getByRole('navigation', { name: '主导航', exact: true }).count(), 0, 'The shell must stay hidden while setup is incomplete.');
  await expect(page.locator('h1')).toHaveText('欢迎使用 Typeless');
  await capture(page, 'setup-welcome');
  await page.getByRole('button', { name: '开始设置', exact: true }).click();

  stage('setup 权限 lists the platform cards and can be postponed');
  await expect(setupStep()).toHaveText('权限');
  await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', /^\d+$/);
  await expect(page.locator('h1')).toHaveText('在这台电脑上设置 Typeless');
  await expect(page.locator('.permission-card')).toHaveCount(setupCards.length);
  assert.deepEqual(await page.locator('.permission-card').evaluateAll(cards => cards.map(card => card.dataset.permission)), setupCards);
  // docs/UI_DESIGN.md section 12.3 defines exactly these states; neither enabling nor relaunch exists.
  const cardStates = await page.locator('.permission-card').evaluateAll(cards => cards.map(card => card.dataset.state));
  assert.equal(cardStates.every(state => ['pending', 'denied', 'stale', 'granted'].includes(state)), true, `Unexpected permission card states: ${cardStates.join(', ')}`);
  await capture(page, 'setup-permissions');
  // 允许 is never clicked: it would raise the real system permission prompt.
  assert.equal((await dispatch(page, { type: 'microphone.test', active: true })).ok, true);
  await page.getByRole('button', { name: '稍后在基本设置中授权', exact: true }).click();

  stage('setup 麦克风 lights the meter from the fake device');
  await expect(setupStep()).toHaveText('麦克风');
  await expect(page.locator('h1')).toHaveText('说几句话，测试麦克风');
  await expect(page.getByLabel('麦克风', { exact: true })).toBeVisible();
  assert.equal(await page.locator('.level-meter i').count(), 15);
  assert.equal((await dispatch(page, { type: 'microphone.test', active: true })).ok, true);
  await page.locator('.mic-detected').waitFor({ state: 'visible', timeout: 10000 });
  await capture(page, 'setup-microphone');
  await page.getByRole('button', { name: '继续', exact: true }).click();

  stage('setup 快捷键 reports no press without one');
  await expect(setupStep()).toHaveText('快捷键');
  await expect(page.locator('h1')).toHaveText('试试快捷键');
  assert.equal(await page.locator('.shortcut-detected').count(), 0, 'No shortcut was pressed, so no detection may be reported.');
  await capture(page, 'setup-shortcut');
  await page.getByRole('button', { name: '继续', exact: true }).click();

  stage('setup 完成 hands an unconfigured install to AI 配置');
  await expect(setupStep()).toHaveText('完成');
  await expect(page.locator('h1')).toHaveText('还差最后一步');
  await capture(page, 'setup-done');
  await page.getByRole('button', { name: '去连接 AI 服务', exact: true }).click();
  await shell().waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await guide().count(), 0, 'The guide must close once setup is complete.');
  assert.equal((await snapshot(page)).settings.general.setupCompleted, true);

  stage('unconfigured launch opens AI 配置 and Home offers the setup action');
  await expect(page.getByRole('tab', { name: 'AI 配置', exact: true })).toHaveAttribute('aria-selected', 'true');
  await openTab('首页');
  await page.getByRole('button', { name: '配置语音', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'AI 配置', exact: true })).toHaveAttribute('aria-selected', 'true');
  stage('missing credentials');
  const missing = await dispatch(page, { type: 'dictation.toggle' });
  assert.equal(missing.ok, false); assert.match(missing.message, /API key/);
  assert.equal(requests.length, 0);
  assert.equal(await page.getByRole('button', { name: '保存设置', exact: true }).count(), 0);
  assert.equal(await page.getByRole('tab').count(), 3);
  const waitSettings = async expected => page.waitForFunction(async expected => {
    const { settings } = await window.typeless.getSnapshot();
    return Object.entries(expected).every(([group, fields]) => Object.entries(fields).every(([key, value]) => settings[group][key] === value));
  }, expected);
  const setLevel = async (value, enabled, strength) => {
    await openTab('AI 配置');
    await page.getByRole('button', { name: { none: '不润色', light: '轻度润色', strong: '强力润色' }[value], exact: true }).click();
    await waitSettings({ cleanup: { enabled }, writing: { strength } });
  };
  stage('automatic writing and basic preferences');
  await setLevel('none', false, 'balanced');
  await setLevel('light', true, 'light');
  await setLevel('strong', true, 'balanced');
  stage('queued instruction saves preserve the latest A-B-A draft');
  await app.evaluate(({ ipcMain }) => {
    const channel = 'typeless:action';
    const original = ipcMain._invokeHandlers.get(channel);
    if (typeof original !== 'function') throw new Error('Action IPC handler is unavailable for the test delay.');
    const gates = [];
    const received = [];
    globalThis.__instructionSaveDelay = { gates, received };
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, action) => {
      if (action.type === 'settings.save' && typeof action.patch?.writing?.instructions === 'string') {
        received.push(action.patch.writing.instructions);
        await new Promise(resolve => gates.push(resolve));
      }
      return original(event, action);
    });
    globalThis.__restoreInstructionHandler = () => {
      ipcMain.removeHandler(channel); ipcMain.handle(channel, original);
      for (const release of gates.splice(0)) release();
    };
  });
  try {
    const field = page.getByLabel(/^个人表达说明/);
    const first = 'Synthetic instruction A';
    const second = 'Synthetic instruction B';
    for (const value of [first, second, first]) {
      await field.fill(value);
      await field.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
    }
    for (const [index, value] of [first, second, first].entries()) {
      await expect.poll(() => app.evaluate(() => globalThis.__instructionSaveDelay.received.length)).toBe(index + 1);
      await expect(field).toHaveValue(first);
      await app.evaluate(() => globalThis.__instructionSaveDelay.gates.shift()());
      await waitSettings({ writing: { instructions: value } });
      // In particular, publishing B must not replace the newer A still in the field.
      await expect(field).toHaveValue(first);
    }
    await expect(page.locator('.save-status')).toHaveCount(0);
    assert.deepEqual(await app.evaluate(() => globalThis.__instructionSaveDelay.received), [first, second, first]);
    assert.equal((await snapshot(page)).settings.writing.instructions, first);
  } finally {
    await app.evaluate(() => globalThis.__restoreInstructionHandler?.());
  }
  const instructions = 'Keep English technical terms and use concise sentences.';
  await page.getByLabel(/^个人表达说明/).fill(instructions);
  await openTab('基本设置');
  await waitSettings({ writing: { instructions } });
  await page.getByRole('switch', { name: '完成后自动粘贴', exact: true }).uncheck();
  await waitSettings({ general: { autoInsert: false } });
  await page.getByLabel(/^主要快捷键/).selectOption('Disabled');
  await waitSettings({ shortcut: { primary: 'Disabled' } });
  await page.getByLabel(/^备用快捷键/).selectOption('CommandOrControl+Shift+D');
  await waitSettings({ shortcut: { fallback: 'CommandOrControl+Shift+D' } });
  assert.equal(await page.getByLabel(/^备用快捷键/).locator('option:checked').innerText().then(text => text.includes('CommandOrControl')), false);
  await page.getByLabel(/^备用快捷键/).selectOption('CommandOrControl+Shift+Space');
  await waitSettings({ shortcut: { fallback: 'CommandOrControl+Shift+Space' } });
  assert.equal(await page.getByLabel(/^备用快捷键/).locator('option:checked').innerText().then(text => text.includes('CommandOrControl')), false);

  await page.screenshot({ path: join(dataRoot, 'basic-settings.png'), animations: 'disabled' });

  stage('atomic provider forms');
  await openTab('AI 配置');
  const provider = name => page.locator('form.provider-panel').filter({ has: page.getByRole('heading', { name, exact: true }) });
  const speech = provider('语音识别');
  const cleanup = provider('文字润色');
  const beforeProvider = (await snapshot(page)).settings;
  await speech.getByLabel(/^语音服务地址/).fill(baseUrl);
  await speech.getByLabel(/^语音模型/).fill('mimo-v2.5-asr');
  await speech.getByLabel(/^语音 API 密钥/).fill('FAKE-ASR-KEY');
  await openTab('基本设置');
  await openTab('AI 配置');
  await expect(speech.getByLabel(/^语音服务地址/)).toHaveValue(baseUrl);
  await expect(speech.getByLabel(/^语音 API 密钥/)).toHaveValue('FAKE-ASR-KEY');
  assert.deepEqual((await snapshot(page)).settings.asr, beforeProvider.asr, 'Provider edits must remain a draft until atomic save.');
  await speech.getByRole('button', { name: '保存', exact: true }).click();
  await waitSettings({ asr: { baseUrl, model: 'mimo-v2.5-asr', hasApiKey: true } });
  await expect(speech.getByLabel(/^语音 API 密钥/)).toHaveValue('');
  assert.deepEqual((await snapshot(page)).settings.cleanup, beforeProvider.cleanup, 'Saving one provider must not mutate the other provider.');
  await cleanup.getByLabel(/^润色服务地址/).fill(baseUrl);
  await cleanup.getByLabel(/^润色模型/).fill('test-cleanup');
  await cleanup.getByLabel(/^润色 API 密钥/).fill('FAKE-TEXT-KEY');
  await cleanup.getByRole('button', { name: '保存', exact: true }).click();
  await waitSettings({ cleanup: { baseUrl, model: 'test-cleanup', hasApiKey: true } });
  await expect(cleanup.getByLabel(/^润色 API 密钥/)).toHaveValue('');
  assert.equal(JSON.stringify(await snapshot(page)).includes('FAKE-'), false);
  await page.screenshot({ path: join(dataRoot, 'ai-settings.png'), animations: 'disabled' });

  stage('failed save retains provider state and draft');
  // A deterministic secure-storage failure exercises the real save IPC error path.
  await app.evaluate(({ safeStorage }) => {
    globalThis.__testEncrypt = safeStorage.encryptString;
    safeStorage.encryptString = () => { throw new Error('Synthetic credential storage failure'); };
  });
  const beforeFailedSave = (await snapshot(page)).settings.asr;
  await speech.getByLabel(/^语音模型/).fill('unsaved-model');
  await speech.getByLabel(/^语音 API 密钥/).fill('FAKE-FAILED-KEY');
  await speech.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: /保存|failure|失败/ }).first().waitFor();
  assert.deepEqual((await snapshot(page)).settings.asr, beforeFailedSave, 'Failed save must not publish the draft.');
  await expect(speech.getByLabel(/^语音模型/)).toHaveValue('unsaved-model');
  await app.evaluate(({ safeStorage }) => { safeStorage.encryptString = globalThis.__testEncrypt; });
  await speech.getByLabel(/^语音模型/).fill('mimo-v2.5-asr');
  await speech.getByLabel(/^语音 API 密钥/).fill('FAKE-ASR-KEY');
  await speech.getByRole('button', { name: '保存', exact: true }).click();
  await expect(speech.getByLabel(/^语音 API 密钥/)).toHaveValue('');

  stage('whitespace key preserves the existing credential');
  await speech.getByLabel(/^语音模型/).fill('synthetic-unsent-model');
  await speech.getByLabel(/^语音 API 密钥/).fill('   ');
  await speech.getByRole('button', { name: '保存', exact: true }).click();
  await waitSettings({ asr: { model: 'synthetic-unsent-model', hasApiKey: true } });
  await expect(speech.getByLabel(/^语音 API 密钥/)).toHaveValue('');
  await speech.getByLabel(/^语音模型/).fill('mimo-v2.5-asr');
  await speech.getByRole('button', { name: '保存', exact: true }).click();
  await waitSettings({ asr: { model: 'mimo-v2.5-asr', hasApiKey: true } });
  // No replacement key is supplied again: later HTTP and restart checks prove retention.

  stage('基本设置 copies a diagnostics report');
  await openTab('基本设置');
  const diagnosticsRow = page.locator('.setting-row.pref-permission-row').filter({ hasText: '诊断信息' });
  await expect(diagnosticsRow).toHaveCount(1);
  // diagnostics.copy writes plain text, bypassing the ownership-marked write this harness restores on close.
  const clipboardBeforeDiagnostics = await app.evaluate(async ({ clipboard }) => clipboard.readText());
  await diagnosticsRow.getByRole('button', { name: '复制诊断信息', exact: true }).click();
  // The label reads 已复制 for two seconds after a successful copy, so the button is located again by its new name.
  await expect(diagnosticsRow.getByRole('button', { name: '已复制', exact: true })).toBeVisible({ timeout: 1000 });
  const report = await app.evaluate(async ({ clipboard }) => clipboard.readText());
  assert.ok(report.startsWith('Typeless '), `The diagnostics report must open with the application name: ${JSON.stringify(report.slice(0, 40))}`);
  assert.ok(report.includes('permissions:'), 'The diagnostics report must carry the permission state.');
  assert.ok(report.includes('native status history'), 'The diagnostics report must carry the native status history.');
  assert.equal(report.includes('FAKE-'), false, 'The diagnostics report must not carry credentials.');
  assert.equal((await dispatch(page, { type: 'diagnostics.copy' })).ok, true);
  await app.evaluate(async ({ clipboard }, previous) => { if (previous) clipboard.writeText(previous); else clipboard.clear(); }, clipboardBeforeDiagnostics);

  stage('基本设置 reruns the guide and 跳过向导 returns to the shell');
  await openTab('基本设置');
  await page.getByRole('button', { name: '重新运行设置向导', exact: true }).click();
  await guide().waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await page.getByRole('navigation', { name: '主导航', exact: true }).count(), 0, 'The rerun guide must replace the shell.');
  assert.equal((await snapshot(page)).settings.general.setupCompleted, false);
  await page.locator('.setup-language').click();
  await page.locator('main.onboarding[aria-label="Setup guide"]').waitFor({ state: 'visible', timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Welcome to Typeless' })).toBeVisible();
  assert.equal((await snapshot(page)).settings.general.language, 'en');
  await page.locator('.setup-language').click();
  await guide().waitFor({ state: 'visible', timeout: 10000 });
  assert.equal((await snapshot(page)).settings.general.language, 'zh');
  await page.getByRole('button', { name: '跳过向导', exact: true }).click();
  await shell().waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await guide().count(), 0);
  assert.equal((await snapshot(page)).settings.general.setupCompleted, true);

  stage('unpolished microphone output skips cleanup HTTP');
  await setLevel('none', false, 'balanced');
  await expect(page.locator('.writing-inactive')).toContainText('开启润色后生效，说明会保留。');
  await page.screenshot({ path: join(dataRoot, 'writing-none.png'), animations: 'disabled' });
  await expect(page.getByLabel(/^个人表达说明/)).toHaveValue(instructions);
  assert.equal((await snapshot(page)).settings.writing.instructions, instructions);
  const beforeRaw = requests.length;
  await record(page);
  let current = await waitStatus(page, 'ready');
  assert.equal(current.session.text, '嗯，下周三下午三点开会。');
  assert.equal(current.session.copied, true);
  assert.equal(await app.evaluate(async ({ clipboard }) => clipboard.readText()), current.session.text);
  assert.equal(requests.length - beforeRaw, 1, 'Unpolished dictation must make only one ASR request.');
  assert.equal(requests.at(-1).body.model, 'mimo-v2.5-asr');

  stage('polished microphone output uses selected provider');
  await setLevel('strong', true, 'balanced');
  await record(page); current = await waitStatus(page, 'ready');
  assert.equal(current.session.rawText, '嗯，下周三下午三点开会。');
  assert.equal(current.session.text, '下周三下午三点开会。');
  assert.equal(current.session.copied, true); assert.equal(current.session.inserted, false);
  const asr = requests.find(item => item.body?.model === 'mimo-v2.5-asr');
  assert.equal(asr.headers['api-key'], 'FAKE-ASR-KEY');
  assert.match(asr.body.messages[0].content[0].input_audio.data, /^data:audio\/wav;base64,UklGR/);
  const polish = requests.find(item => item.body?.model === 'test-cleanup');
  assert.equal(polish.headers.authorization, 'Bearer FAKE-TEXT-KEY');
  await openTab('首页');
  await expect(page.locator('.result-text')).toBeVisible();
  await page.screenshot({ path: join(dataRoot, 'home-result.png'), animations: 'disabled' });
  stage('raw result copy does not replace the polished result');
  const resultBeforeCopy = (await snapshot(page)).session;
  await page.getByRole('group', { name: '听写结果视图', exact: true }).getByRole('button', { name: '原文', exact: true }).click();
  await expect(page.locator('.result-text')).toHaveText(resultBeforeCopy.rawText);
  await page.screenshot({ path: join(dataRoot, 'result-raw.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '复制本次听写', exact: true }).click();
  await expect(page.getByRole('button', { name: '已复制', exact: true })).toBeVisible();
  assert.equal(await app.evaluate(async ({ clipboard }) => clipboard.readText()), resultBeforeCopy.rawText);
  const afterRawCopy = (await snapshot(page)).session;
  assert.equal(afterRawCopy.text, resultBeforeCopy.text); assert.equal(afterRawCopy.rawText, resultBeforeCopy.rawText);
  assert.equal(afterRawCopy.inserted, resultBeforeCopy.inserted);
  await page.getByRole('group', { name: '听写结果视图', exact: true }).getByRole('button', { name: '整理后', exact: true }).click();
  await expect(page.locator('.result-text')).toHaveText(resultBeforeCopy.text);

  stage('capture error code gives localized recovery without a false retry');
  const requestsBeforeCaptureError = requests.length;
  assert.equal((await dispatch(page, { type: 'dictation.toggle' })).ok, true);
  const recording = await waitStatus(page, 'recording');
  await page.evaluate(sessionId => window.typeless.reportCapture({ type: 'error', sessionId, code: 'no_speech', message: 'Synthetic capture contained no speech.' }), recording.session.id);
  const noSpeech = await waitStatus(page, 'error');
  assert.equal(noSpeech.session.errorCode, 'no_speech'); assert.equal(noSpeech.session.canRetry, false);
  const errorOverlay = app.windows().find(candidate => candidate.url().endsWith('#overlay'));
  assert.ok(errorOverlay, 'Error recovery overlay was not found.');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#default')).hide());
  await errorOverlay.getByRole('button', { name: '查看听写问题', exact: true }).click();
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#default')).isVisible())).toBe(true);
  const captureError = page.locator('.dictation-panel [role="alert"]');
  await expect(captureError).toContainText('未检测到声音');
  await expect(captureError).not.toContainText('Synthetic');
  await page.screenshot({ path: join(dataRoot, 'no-speech-recovery.png'), animations: 'disabled' });
  assert.equal(await captureError.getByRole('button', { name: '重试', exact: true }).count(), 0);
  await captureError.getByRole('button', { name: '基本设置', exact: true }).click();
  await expect(page.getByRole('tab', { name: '基本设置', exact: true })).toHaveAttribute('aria-selected', 'true');
  assert.equal(requests.length, requestsBeforeCaptureError);


  stage('cancelled late response cannot replace clipboard');
  const beforeCancelClipboard = await app.evaluate(async ({ clipboard }) => clipboard.readText());
  const beforeCancel = requests.length;
  slow = true; await record(page); await waitStatus(page, 'transcribing');
  await dispatch(page, { type: 'dictation.cancel' }); await page.waitForTimeout(1800);
  current = await snapshot(page); assert.equal(current.session.status, 'cancelled');
  assert.equal(await app.evaluate(async ({ clipboard }) => clipboard.readText()), beforeCancelClipboard);
  assert.equal(requests.slice(beforeCancel).filter(item => item.body?.model === 'test-cleanup').length, 0);
  slow = false;

  stage('home status list and update check');
  await openTab('首页');
  await expect(page.locator('.status-list .status-row')).toHaveCount(3);
  assert.equal(await page.locator('.home-hero, .usecase-grid, .home-rail, .quickstart-card, .home-version, .sidebar-footer').count(), 0);
  await page.screenshot({ path: join(dataRoot, 'home.png'), animations: 'disabled' });
  await openTab('AI 配置');
  await expect(provider('文字润色').getByRole('button', { name: '强力润色', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(provider('文字润色').getByLabel('个人表达说明')).toBeVisible();
  await page.screenshot({ path: join(dataRoot, 'ai.png'), fullPage: true, animations: 'disabled' });
  await openTab('基本设置');
  // The automatic check may already have run (15 s after launch), so trigger the manual one through IPC instead of the button whose label depends on timing.
  assert.equal((await dispatch(page, { type: 'update.check' })).ok, true);
  await expect(page.locator('.about-row .badge')).toHaveText(/有新版本 99\.0\.0/, { timeout: 10000 });
  await expect(page.locator('.sidebar-update')).toHaveText(/99\.0\.0/);
  await page.getByRole('button', { name: '下载更新', exact: true }).click();
  await expect(page.getByRole('button', { name: '打开安装包', exact: true })).toBeVisible({ timeout: 15000 });
  const updateState = (await snapshot(page)).update;
  assert.equal(updateState.status, 'downloaded');
  assert.ok(updateState.filePath.startsWith(join(dataRoot, 'downloads')), 'The installer must land in the profile downloads folder.');
  assert.equal((await readFile(updateState.filePath)).length, updatePayload.length);
  assert.equal(await page.locator('.sidebar-update').count(), 0, 'The sidebar pill disappears once the installer is downloaded.');
  await page.screenshot({ path: join(dataRoot, 'basic.png'), fullPage: true, animations: 'disabled' });
  stage('restart persistence');
  await closeInstance(app); app = undefined;
  launched = await launch(); app = launched.instance; page = launched.page;
  current = await snapshot(page);
  assert.equal(current.settings.general.setupCompleted, true);
  assert.equal(await guide().count(), 0, 'A completed setup must not reopen the guide after a restart.');
  await shell().waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(current.settings.asr.hasApiKey, true); assert.equal(current.settings.cleanup.hasApiKey, true);
  assert.equal(current.settings.general.autoInsert, false); assert.equal(current.settings.shortcut.primary, 'Disabled');
  assert.equal(current.settings.cleanup.enabled, true); assert.equal(current.settings.writing.strength, 'balanced');
  assert.equal(current.settings.writing.instructions, instructions);
  await openTab('AI 配置');
  await expect(page.getByRole('button', { name: '强力润色', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await openTab('基本设置');
  await expect(page.getByRole('switch', { name: '完成后自动粘贴', exact: true })).not.toBeChecked();
  await expect(page.getByLabel(/^主要快捷键/)).toHaveValue('Disabled');
  await openTab('AI 配置');
  await expect(provider('语音识别').getByLabel(/^语音 API 密钥/)).toHaveValue('');
  await expect(provider('文字润色').getByLabel(/^润色 API 密钥/)).toHaveValue('');
  stage('minimum-window layout');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#default')).setSize(880, 600));
  for (const [name, file] of [['首页', 'home'], ['AI 配置', 'ai'], ['基本设置', 'basic']]) {
    await openTab(name);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${name} must not overflow horizontally.`);
    await page.screenshot({ path: join(dataRoot, `minimum-${file}.png`), fullPage: true, animations: 'disabled' });
  }
  stage('language switch renders the shell in English and back');
  await openTab('基本设置');
  await page.getByRole('group', { name: '语言', exact: true }).getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  assert.equal((await snapshot(page)).settings.general.language, 'en');
  await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // The restart above reset the release check, so the row is back to its unchecked or freshly checked state.
  await expect(page.locator('.about-row .badge')).toHaveText(/^(Not checked|Checking…|Version 99\.0\.0 available)$/);
  await expect(page.getByRole('button', { name: /^(Check for updates|Checking…|Download update)$/ })).toBeVisible();
  for (const [name, file] of [['Home', 'home'], ['AI Setup', 'ai'], ['Settings', 'basic']]) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${name} must not overflow horizontally in English.`);
    // The language option 中文 is always written in its own language, so it is the one CJK string allowed here.
    assert.equal(await page.evaluate(() => /[\u4e00-\u9fff]/.test(document.querySelector('main.content').innerText.replace(/中文/g, ''))), false, `${name} must not show Chinese copy in English.`);
    await page.screenshot({ path: join(dataRoot, `english-${file}.png`), fullPage: true, animations: 'disabled' });
  }
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: '中文', exact: true }).click();
  await page.getByRole('navigation', { name: '主导航', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'zh-CN');
  const disk = await readFile(join(dataRoot, 'settings', 'state.json'), 'utf8');
  assert.ok(!disk.includes('FAKE-ASR-KEY')); assert.ok(!disk.includes('FAKE-TEXT-KEY')); assert.ok(!disk.includes('FAKE-FAILED-KEY'));
  const receipt = { ok: true, checks: ['setup-guide-fresh-launch', 'setup-permissions-skip', 'setup-microphone-meter', 'setup-shortcut-step', 'setup-done-opens-ai', 'setup-rerun-and-skip', 'diagnostics-copy-report', 'restart-skips-setup', 'unconfigured-launch-opens-ai', 'setup-action-opens-ai', 'raw-view-copy-preserves-result', 'copy-success-feedback', 'no-speech-localized-recovery', 'error-capsule-opens-main-on-click', 'no-false-audio-retry', 'none-instructions-retained-inactive', 'whitespace-key-retention', 'autosave-delayed-A-B-A', 'three-sidebar-tabs', 'home-status-list', 'writing-controls-in-ai', 'update-check-and-download', 'instructions-blur-save', 'provider-draft-tab-retention', 'minimum-window-three-pages', 'language-switch-english-pages', 'welcome-language-toggle', 'fallback-preset-save-and-readable-label', 'polishing-autosave', 'basic-select-and-toggle-autosave', 'atomic-provider-save', 'failed-save-retains-state', 'keys-never-echoed', 'unpolished-asr-only-clipboard', 'real-preload-ipc', 'fake-microphone-wav', 'mimo-http', 'cleanup-http', 'cancel-late-response-clipboard-fence', 'missing-credentials', 'restart-persistence'], providerRequests: requests.length, dataRoot, limitations: 'HTTP providers, audio, secure storage and the reported microphone permission status are test doubles. No live provider, real microphone, system permission prompt, physical shortcut or external insertion was tested. Mock output does not establish polishing quality.' };
  await writeFile(join(dataRoot, 'result.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
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
