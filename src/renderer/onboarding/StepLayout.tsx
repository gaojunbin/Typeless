import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../i18n';

/** Shared step chrome: a white panel on the left, the art panel with one hero card on the right. */
export function StepLayout({ title, subtitle, onBack, hero, footerLeft, footerRight, children }: {
  title: string; subtitle?: string; onBack?: () => void; hero?: ReactNode; footerLeft?: ReactNode; footerRight: ReactNode; children: ReactNode;
}) {
  const { t } = useI18n();
  return <div className="setup-body">
    <section className="setup-panel">
      {onBack && <button type="button" className="text-button setup-back" onClick={onBack}><ArrowLeft size={14} aria-hidden="true" />{t('onboarding.back')}</button>}
      <div className="setup-content">
        <h1>{title}</h1>
        {subtitle && <p className="setup-subtitle">{subtitle}</p>}
        {children}
      </div>
      <div className="setup-footer">
        <div className="setup-footer-left">{footerLeft}</div>
        {footerRight}
      </div>
    </section>
    <aside className="setup-art">{hero}</aside>
  </div>;
}
