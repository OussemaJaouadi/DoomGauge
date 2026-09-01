import React, { useState } from 'react';
import './Tooltip.css';

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="ui-tooltip-anchor"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <span className={`ui-tooltip ui-tooltip-${side}`} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}

export function ChartTooltip({
  x,
  y,
  children,
  visible,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="ui-chart-tooltip"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}
