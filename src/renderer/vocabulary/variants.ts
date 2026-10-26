import type { ClipboardEvent } from 'react';

/**
 * Splits the 常被识别成 field into separate misrecognitions: on ASCII and full-width commas, the
 * enumeration comma, ASCII and full-width semicolons and line breaks. Spaces inside a variant stay,
 * because a misrecognition can be several words. Main trims, deduplicates and checks the limits again.
 */
export function splitVariants(text: string): string[] {
  return text.split(/[,，、;；\r\n]+/).map(part => part.trim()).filter(Boolean);
}

/**
 * Paste handler for a 常被识别成 input. A single-line input turns pasted line breaks into spaces, which
 * would merge a one-per-line list into one variant, so such a paste is inserted joined by `separator`.
 */
export function pasteVariants(update: (value: string) => void, separator: string) {
  return (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text/plain');
    if (event.currentTarget.readOnly || !/[\r\n]/.test(text)) return;
    event.preventDefault();
    const { value, selectionStart, selectionEnd } = event.currentTarget;
    update(value.slice(0, selectionStart ?? value.length) + splitVariants(text).join(separator) + value.slice(selectionEnd ?? value.length));
  };
}
