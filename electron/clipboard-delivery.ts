import { clipboard, ClipboardItem } from 'electron';
import { randomUUID } from 'node:crypto';
import type { NativeInsertResult } from './native-client';

type Paste = (text: string, options: { clipboardOwner: string; signal?: AbortSignal }) => Promise<NativeInsertResult>;

export class ClipboardDelivery {
  private pending: Promise<void> = Promise.resolve();
  private lastCopy?: { text: string; owner: string };

  constructor(private dispatchPaste: Paste) {}

  copy(text: string, signal?: AbortSignal): Promise<void> {
    const operation = this.pending.then(async () => {
      signal?.throwIfAborted();
      const owner = randomUUID();
      await clipboard.write([new ClipboardItem({
        'text/plain': text,
        'electron application/osclipboard;format="dev.typeless.owner"': new Blob([owner]),
      })]);
      this.lastCopy = { text, owner };
    });
    this.pending = operation.catch(() => {});
    return operation;
  }

  async paste(text: string, signal?: AbortSignal): Promise<NativeInsertResult> {
    await this.pending;
    if (signal?.aborted) return { ok: false, code: 'cancelled', message: 'Paste was cancelled. The copied text remains available.' };
    if (!this.lastCopy || this.lastCopy.text !== text) return { ok: false, code: 'clipboard_changed', message: 'The clipboard changed before paste.' };
    return this.dispatchPaste(text, { clipboardOwner: this.lastCopy.owner, signal });
  }
}
