/**
 * Declares one area's copy. Keys are inferred from the Chinese text, so the English object must
 * carry exactly the same keys or the typecheck fails. Keys are `area.component.name`, and `{name}`
 * marks a placeholder filled by `translate()`.
 */
export function defineMessages<K extends string>(messages: { zh: Record<K, string>; en: Record<K, string> }): { zh: Record<K, string>; en: Record<K, string> } {
  return messages;
}
