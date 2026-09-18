import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { SessionStatus } from '../shared/contracts';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function Busy() { return <LoaderCircle size={16} className="spin" aria-hidden="true" />; }
export function Wave({ level, active }: { level: number; active: boolean }) {
  const amplitude = Math.max(0, Math.min(1, level));
  return <div className={`wave ${active ? 'active' : ''}`} aria-hidden="true">{Array.from({ length: 27 }, (_, index) => <i key={index} style={{ height: `${active ? 3 + (Math.sin(index * 2.3) + 1.3) * amplitude * 24 : 3}px` }} />)}</div>;
}
export const clockText = (milliseconds: number) => `${Math.floor(milliseconds / 60000).toString().padStart(2, '0')}:${Math.floor(milliseconds / 1000 % 60).toString().padStart(2, '0')}`;
export const sessionLabels: Record<SessionStatus, string> = {
  idle: '准备就绪', arming: '正在连接麦克风', recording: '正在录音', transcribing: '正在识别', polishing: '正在整理', inserting: '正在复制与粘贴', ready: '结果已就绪', error: '处理未完成', cancelled: '录音已取消',
};
