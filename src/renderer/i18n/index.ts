import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { Language } from '../../shared/contracts';
import { common } from './messages/common';
import { home } from './messages/home';
import { session } from './messages/session';
import { settings } from './messages/settings';
import { onboarding } from './messages/onboarding';

/**
 * Interface copy lives in `messages/*.ts`, one file per area, each holding the Chinese and the
 * English text under identical keys. Components read it through `useI18n()`; modules without
 * React context call `translate()` with the language from the snapshot.
 */

const zh = { ...common.zh, ...home.zh, ...session.zh, ...settings.zh, ...onboarding.zh };
const en = { ...common.en, ...home.en, ...session.en, ...settings.en, ...onboarding.en };

export type MessageKey = keyof typeof zh;
export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: Params) => string;

export const catalog: Record<Language, Record<MessageKey, string>> = { zh, en };

/** Fills `{name}` placeholders from `params`; unknown placeholders are left as written. */
export function translate(language: Language, key: MessageKey, params?: Params): string {
  const template = catalog[language][key] ?? catalog.zh[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** Maps the interface language to the BCP 47 tag placed on the document. */
export function documentLanguage(language: Language): string {
  return language === 'zh' ? 'zh-CN' : 'en';
}

const I18nContext = createContext<Language>('zh');

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return createElement(I18nContext.Provider, { value: language }, children);
}

export function useI18n(): { language: Language; t: Translate } {
  const language = useContext(I18nContext);
  return { language, t: (key, params) => translate(language, key, params) };
}
