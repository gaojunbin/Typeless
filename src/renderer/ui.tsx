import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { SessionStatus } from '../shared/contracts';
import { shortcutLabel } from './shortcutPresentation';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return <header className="page-header">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>;
}

export function SectionGroup({ icon, title, description, children, className = '' }: { icon?: ReactNode; title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`group ${className}`.trim()}>
    <div className="group-header">{icon}<h2>{title}</h2></div>
    {description && <p className="group-description">{description}</p>}
    {children}
  </section>;
}

export function SettingRow({ label, description, htmlFor, control, status, stacked = false, inline = false, className = '' }: {
  label: ReactNode; description?: ReactNode; htmlFor?: string; control: ReactNode; status?: ReactNode; stacked?: boolean; inline?: boolean; className?: string;
}) {
  return <div className={`setting-row ${stacked ? 'stacked' : ''} ${className}`.trim()}>
    <div className="row-text">
      {htmlFor ? <label className="row-label" htmlFor={htmlFor}>{label}</label> : <span className="row-label">{label}</span>}
      {description && <p className="row-description">{description}</p>}
    </div>
    <div className={`row-control ${inline ? 'inline' : ''}`.trim()}>{control}{status && <div className="row-status">{status}</div>}</div>
  </div>;
}

export function Card({ children, className = '', tone = 'plain' }: { children: ReactNode; className?: string; tone?: 'plain' | 'muted' | 'raised' }) {
  return <div className={`card ${tone === 'plain' ? '' : tone} ${className}`.trim()}>{children}</div>;
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel, disabled = false }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; ariaLabel: string; disabled?: boolean;
}) {
  return <div className="segmented" role="group" aria-label={ariaLabel}>
    {options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} disabled={disabled} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

export function KeyChips({ binding, mac, framed = false, size = 'chip' }: { binding: string; mac: boolean; framed?: boolean; size?: 'chip' | 'keycap' }) {
  const keycap = size === 'keycap';
  const chips = <span className={`keychips ${keycap ? 'keycaps' : ''}`.trim()}>{shortcutLabel(binding, mac).split(' ').filter(Boolean).map((part, index) => <kbd key={`${part}-${index}`} className={keycap ? 'keycap' : undefined}>{part}</kbd>)}</span>;
  return framed ? <span className="keychips-frame">{chips}</span> : chips;
}

export function StatusBadge({ tone, children }: { tone: 'ok' | 'warn' | 'muted' | 'accent'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Busy({ size = 16 }: { size?: number }) { return <LoaderCircle size={size} className="spin" aria-hidden="true" />; }

/** The application icon's seven-bar mark as a vector, so the sidebar and the setup guide match the Dock icon exactly. */
export function BrandMark({ size = 22, className }: { size?: number; className?: string }) {
  const bars = [3, 6, 9, 12, 9, 6, 3];
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {bars.map((height, index) => <rect key={index} x={2 + index * 3} y={12 - height / 2} width={2} height={height} rx={1} />)}
  </svg>;
}

export function Wave({ level, active, bars = 27 }: { level: number; active: boolean; bars?: number }) {
  const amplitude = Math.max(0, Math.min(1, level));
  return <div className={`wave ${active ? 'active' : ''}`} aria-hidden="true">{Array.from({ length: bars }, (_, index) => <i key={index} style={{ height: `${active ? 3 + (Math.sin(index * 2.3) + 1.3) * amplitude * 20 : 3}px` }} />)}</div>;
}

export const clockText = (milliseconds: number) => `${Math.floor(milliseconds / 60000).toString().padStart(2, '0')}:${Math.floor(milliseconds / 1000 % 60).toString().padStart(2, '0')}`;
export const sessionLabels: Record<SessionStatus, string> = {
  idle: '准备就绪', arming: '正在连接麦克风', recording: '正在录音', transcribing: '正在识别', polishing: '正在整理', inserting: '正在复制与粘贴', ready: '结果已就绪', error: '处理未完成', cancelled: '录音已取消',
};
