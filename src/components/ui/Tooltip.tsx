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

// NOTE: the old positioned ChartTooltip export lived here; it is superseded by
// ui/ChartTooltip.tsx (head + children API, used by all 7 chart tooltips).
// This file keeps the hover Tooltip for future rack/legend explainers.
