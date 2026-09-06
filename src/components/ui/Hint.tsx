// React & 3rd-party
import React, { useState, useRef, useEffect } from 'react';
import { CircleHelp } from 'lucide-react';

// Styles
import './Hint.css';

export interface HintProps {
  title: string;
  text: string;
  className?: string;
}

export function Hint({
  title,
  text,
  className = '',
}: HintProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`ui-hint ${className}`} ref={containerRef}>
      <button
        type="button"
        className={`ui-hint-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Show info: ${title}`}
        title="Show info"
      >
        <CircleHelp size={12} />
      </button>

      {open && (
        <div className="ui-hint-popover" role="tooltip">
          <div className="ui-hint-title">{title}</div>
          <div className="ui-hint-text">{text}</div>
        </div>
      )}
    </div>
  );
}
