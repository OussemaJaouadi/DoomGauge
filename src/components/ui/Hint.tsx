import { useState, useRef, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { dismissHintOnEscape, hintPosition } from '../../utils/hintPosition';
import './Hint.css';
import type { HintContent } from './hintContent';
import { HintBody } from './HintBody';

export interface HintProps {
  text: HintContent; label?: string; accent?: 'amber' | 'blue' | 'neutral'; className?: string;
}
export function Hint({ text, label = 'Measurement info', accent = 'neutral', className = '' }: HintProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const floating = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const id = useId();
  const close = () => setHost(null);
  useLayoutEffect(() => {
    if (!host) return;
    const position = () => {
      const button = trigger.current, popup = floating.current;
      if (!button || !popup) return;
      const bounds = popup.getBoundingClientRect();
      const point = hintPosition(button.getBoundingClientRect(), bounds, { width: document.documentElement.clientWidth, height: window.innerHeight });
      popup.style.left = point.left + 'px'; popup.style.top = point.top + 'px'; popup.style.visibility = 'visible';
    };
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !floating.current?.contains(event.target as Node)) close(); };
    const key = (event: KeyboardEvent) => dismissHintOnEscape(event, close);
    position();
    const observer = new ResizeObserver(position);
    if (floating.current) observer.observe(floating.current);
    document.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', key, true);
    return () => {
      observer.disconnect(); document.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position); document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', key, true);
    };
  }, [host, text]);
  return <span className={`ui-hint ui-hint-${accent} ${className}`}>
    <button ref={trigger} type="button" className={`ui-hint-btn ui-hint-btn-${accent} ${host ? 'active' : ''}`}
      onClick={() => { if (host) close(); else setHost(trigger.current?.closest<HTMLElement>('dialog, .popup-shell, .telemetry-app') ?? document.body); }}
      aria-expanded={!!host} aria-controls={host ? id : undefined} aria-describedby={host ? id : undefined} aria-label={label}>
      <CircleHelp size={14} strokeWidth={2} />
    </button>
    {host && createPortal(<div ref={floating} id={id} role="tooltip" className={`ui-hint-popover ui-hint-floating ui-hint-popover-${accent}`} style={{ visibility: 'hidden' }}><HintBody content={text} /></div>, host)}
  </span>;
}
