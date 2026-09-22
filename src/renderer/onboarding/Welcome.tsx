import type { Language } from '../../shared/contracts';
import { useI18n } from '../i18n';
import type { RunAction } from '../settings/types';
import { BrandMark } from '../ui';

/** Welcome screen. The language button switches the interface before anything else is decided. */
export function Welcome({ run, onStart, onSkip }: { run: RunAction; onStart: () => void; onSkip: () => void }) {
  const { language, t } = useI18n();
  const other: Language = language === 'zh' ? 'en' : 'zh';
  const switchLanguage = () => { void run({ type: 'settings.save', patch: { general: { language: other } } }); };
  return <div className="setup-welcome-card">
    <BrandMark size={32} />
    <h1>{t('onboarding.welcome.title')}</h1>
    <p className="setup-subtitle">{t('onboarding.welcome.subtitle')}</p>
    <button type="button" className="primary setup-welcome-start" onClick={onStart}>{t('onboarding.welcome.start')}</button>
    <button type="button" className="text-button" onClick={onSkip}>{t('onboarding.welcome.skip')}</button>
    <button type="button" className="text-button setup-language" onClick={switchLanguage}>{t(other === 'en' ? 'common.language.en' : 'common.language.zh')}</button>
  </div>;
}
