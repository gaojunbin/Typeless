import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Store, type SecretCrypto } from '../src/core/store';
import { SYNC_BUNDLE_FILE } from '../src/core/sync';
import { Controller } from '../electron/controller';
import { Providers } from '../src/core/providers';

const paths: string[] = [];

/** Simulates a device-locked OS Keychain (like Electron safeStorage on Mac A vs Mac B). */
function deviceCrypto(deviceTag: string): SecretCrypto {
  const prefix = `OS-KEYCHAIN-${deviceTag}:`;
  return {
    available: () => true,
    encrypt: value => Buffer.from(`${prefix}${value}`, 'utf8').toString('base64'),
    decrypt: value => {
      const decoded = Buffer.from(value, 'base64').toString('utf8');
      if (!decoded.startsWith(prefix)) throw new Error(`Keychain mismatch: cannot decrypt with ${deviceTag}`);
      return decoded.slice(prefix.length);
    },
  };
}

function makeTempDir(prefix: string) {
  mkdirSync('.local/tests', { recursive: true });
  const dir = mkdtempSync(`.local/tests/${prefix}-`);
  paths.push(dir);
  return dir;
}

afterEach(() => {
  delete process.env.TYPELESS_ICLOUD_DIR;
  paths.splice(0).forEach(path => rmSync(path, { recursive: true, force: true }));
});

describe('multi-device iCloud / folder sync and dictation history', () => {
  it('syncs API keys across devices with distinct OS keychains using AES-256-GCM without exposing plaintext', () => {
    const dirA = makeTempDir('device-a');
    const dirB = makeTempDir('device-b');
    const icloudFolder = join(makeTempDir('icloud'), 'Typeless');

    const storeA = new Store(join(dirA, 'state.json'), deviceCrypto('MAC-A'));
    storeA.saveSettings(
      {
        asr: { kind: 'openai', baseUrl: 'https://asr.example.com/v1', model: 'whisper-large-v3' },
        cleanup: { enabled: true, baseUrl: 'https://llm.example.com/v1', model: 'gpt-4o-mini' },
        writing: { strength: 'light', instructions: 'Use concise Chinese.', language: 'zh' },
        audio: { deviceId: 'mac-a-mic' },
        general: { setupCompleted: true },
      },
      { asr: 'sk-asr-secret-123', cleanup: 'sk-llm-secret-456' },
      1000,
    );
    storeA.saveVocabulary({ term: 'Typeless', soundsLike: ['tapless', 'type less'] }, 1100);
    storeA.recordHistory({
      id: 'session-1',
      startedAt: 1200,
      durationMs: 3500,
      rawText: '嗯，测试一下 tapless 同步',
      text: '测试一下 Typeless 同步。',
      polished: true,
    }, 1200);

    // Enable iCloud folder sync on Device A
    storeA.setSyncFolder(icloudFolder, 1300);

    const bundleRaw = readFileSync(join(icloudFolder, SYNC_BUNDLE_FILE), 'utf8');
    expect(bundleRaw).not.toContain('sk-asr-secret-123');
    expect(bundleRaw).not.toContain('sk-llm-secret-456');

    // Device B has its own isolated OS keychain and local device settings
    const storeB = new Store(join(dirB, 'state.json'), deviceCrypto('IPHONE-B'));
    expect(storeB.snapshot().settings.asr.hasApiKey).toBe(false);
    expect(storeB.snapshot().settings.general.setupCompleted).toBe(false);

    // Point Device B to the same iCloud folder
    storeB.setSyncFolder(icloudFolder, 1400);

    // Shared provider settings and API keys are immediately available on Device B
    expect(storeB.snapshot().settings.asr).toEqual({
      kind: 'openai',
      baseUrl: 'https://asr.example.com/v1',
      model: 'whisper-large-v3',
      hasApiKey: true,
    });
    expect(storeB.snapshot().settings.cleanup).toEqual({
      enabled: true,
      baseUrl: 'https://llm.example.com/v1',
      model: 'gpt-4o-mini',
      hasApiKey: true,
    });
    expect(storeB.snapshot().settings.writing).toEqual({
      strength: 'light',
      instructions: 'Use concise Chinese.',
      language: 'zh',
    });
    expect(storeB.secret('asr')).toBe('sk-asr-secret-123');
    expect(storeB.secret('cleanup')).toBe('sk-llm-secret-456');

    // Device-local settings on Device B are preserved (not overwritten by Device A's hardware/setup flags)
    expect(storeB.snapshot().settings.audio.deviceId).toBe('default');
    expect(storeB.snapshot().settings.general.setupCompleted).toBe(false);

    // Vocabulary and history are synced to Device B
    expect(storeB.vocabulary().map(v => [v.term, v.soundsLike])).toEqual([['Typeless', ['tapless', 'type less']]]);
    expect(storeB.history().map(h => [h.id, h.text])).toEqual([['session-1', '测试一下 Typeless 同步。']]);
  });

  it('merges vocabulary, usage counts, history and deletion tombstones bidirectionally', () => {
    const dirA = makeTempDir('merge-a');
    const dirB = makeTempDir('merge-b');
    const syncFolder = join(makeTempDir('sync-shared'), 'Typeless');

    const storeA = new Store(join(dirA, 'state.json'), deviceCrypto('A'));
    const storeB = new Store(join(dirB, 'state.json'), deviceCrypto('B'));

    storeA.setSyncFolder(syncFolder, 100);
    storeB.setSyncFolder(syncFolder, 110);

    const claude = storeA.saveVocabulary({ term: 'Claude', soundsLike: ['云'] }, 200);
    storeB.saveVocabulary({ term: 'SwiftUI', soundsLike: ['swift ui'] }, 210);
    storeB.recordHistory({
      id: 'ios-dictation-1',
      startedAt: 220,
      durationMs: 2000,
      rawText: '用 swift ui 写输入法',
      text: '用 SwiftUI 写输入法。',
      polished: true,
    }, 220);

    // Pull Device B's changes into Device A
    expect(storeA.syncNow(250)).toBe(true);
    expect(storeA.vocabulary().map(v => v.term).sort()).toEqual(['Claude', 'SwiftUI']);
    expect(storeA.history().map(h => h.id)).toEqual(['ios-dictation-1']);

    // Delete a vocabulary word and history item on Device A and sync to Device B
    storeA.deleteVocabulary(claude.id, 300);
    storeA.deleteHistory('ios-dictation-1', 300);

    expect(storeB.syncNow(350)).toBe(true);
    expect(storeB.vocabulary().map(v => v.term)).toEqual(['SwiftUI']);
    expect(storeB.history()).toEqual([]);
  });

  it('supports history and iCloud sync actions through Controller', async () => {
    const icloudRoot = makeTempDir('fake-icloud');
    process.env.TYPELESS_ICLOUD_DIR = icloudRoot;

    const dir = makeTempDir('ctrl');
    const store = new Store(join(dir, 'state.json'), deviceCrypto('CTRL'));
    let copiedText = '';
    const provider = new Providers();
    const controller = new Controller(store, provider, {
      capture: vi.fn(),
      publish: vi.fn(),
      paste: vi.fn(async () => ({ ok: true, status: 'dispatched' })),
      permissions: vi.fn(),
      openPane: vi.fn(),
      microphoneTest: vi.fn(),
      copy: vi.fn(async text => { copiedText = text; }),
      show: vi.fn(),
      hide: vi.fn(),
      quit: vi.fn(),
      relaunch: vi.fn(),
      copyDiagnostics: vi.fn(async () => {}),
      checkUpdate: vi.fn(async () => {}),
      downloadUpdate: vi.fn(async () => {}),
      openUpdate: vi.fn(async () => {}),
      installUpdate: vi.fn(async () => {}),
      openReleasePage: vi.fn(async () => {}),
      settingsChanged: vi.fn(async () => {}),
    }, '2.4.5');

    store.recordHistory({
      id: 'h1',
      startedAt: 1000,
      durationMs: 1500,
      rawText: 'raw transcript',
      text: 'polished transcript',
      polished: true,
    });

    expect(controller.snapshot().history).toHaveLength(1);
    expect((await controller.dispatch({ type: 'history.copy', id: 'h1', source: 'result' })).ok).toBe(true);
    expect(copiedText).toBe('polished transcript');
    expect((await controller.dispatch({ type: 'history.copy', id: 'h1', source: 'raw' })).ok).toBe(true);
    expect(copiedText).toBe('raw transcript');

    expect(controller.snapshot().sync?.icloudAvailable).toBe(true);
    expect((await controller.dispatch({ type: 'sync.useIcloud' })).ok).toBe(true);
    expect(controller.snapshot().sync?.enabled).toBe(true);
    expect(controller.snapshot().sync?.folderPath).toBe(resolve(icloudRoot, 'Typeless'));

    expect((await controller.dispatch({ type: 'history.delete', id: 'h1' })).ok).toBe(true);
    expect(controller.snapshot().history).toEqual([]);

    expect((await controller.dispatch({ type: 'sync.disable' })).ok).toBe(true);
    expect(controller.snapshot().sync?.enabled).toBe(false);
  });

  it.skipIf(process.platform !== 'darwin')('interoperates byte-for-byte between Desktop (Node crypto) and iOS (Swift CryptoKit) on the same iCloud folder', () => {
    const swiftBinary = resolve('ios', '.build', 'debug', 'typeless-ios-selftest');
    if (!existsSync(swiftBinary)) {
      execFileSync('swift', ['build', '--product', 'typeless-ios-selftest'], { cwd: resolve('ios'), stdio: 'ignore' });
    }
    const dirDesktop = makeTempDir('desktop-interop');
    const sharedICloudFolder = resolve(makeTempDir('shared-icloud-interop'), 'Typeless');

    const desktopStore = new Store(join(dirDesktop, 'state.json'), deviceCrypto('MAC-DESKTOP'));
    desktopStore.saveSettings(
      {
        asr: { kind: 'mimo', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5-asr' },
        cleanup: { enabled: true, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
      },
      { asr: 'sk-mimo-desktop-key', cleanup: 'sk-openai-desktop-key' },
      1000,
    );
    desktopStore.saveVocabulary({ term: 'DesktopTerm', soundsLike: ['desktop term'] }, 1100);
    desktopStore.setSyncFolder(sharedICloudFolder, 1200);

    // Run the Swift iOS engine against the exact same iCloud folder
    const output = execFileSync(swiftBinary, ['--verify-sync-folder', sharedICloudFolder], { encoding: 'utf8' }).trim();
    const iosReport = JSON.parse(output.split('\n').at(-1)!);
    expect(iosReport.asrKey).toBe('sk-mimo-desktop-key');
    expect(iosReport.cleanupKey).toBe('sk-openai-desktop-key');
    expect(iosReport.asrModel).toBe('mimo-v2.5-asr');
    expect(iosReport.vocabulary.sort()).toEqual(['DesktopTerm', 'iOSKeyboard']);
    expect(iosReport.historyCount).toBe(1);

    // Pull the iOS changes back into the Desktop store
    expect(desktopStore.syncNow(6000)).toBe(true);
    expect(desktopStore.vocabulary().map(v => v.term).sort()).toEqual(['DesktopTerm', 'iOSKeyboard']);
    expect(desktopStore.history().map(h => h.id)).toEqual(['ios-from-swift']);
  });
});
