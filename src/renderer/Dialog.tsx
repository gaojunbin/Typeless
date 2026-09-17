import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = ref.current;
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []);
    (panel?.querySelector<HTMLElement>('input, textarea') ?? controls()[0] ?? panel)?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = controls();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) { event.preventDefault(); panel?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <div className="section-title"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div>
      {children}
    </section>
  </div>;
}
