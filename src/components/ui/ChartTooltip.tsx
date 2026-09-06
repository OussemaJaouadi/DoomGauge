import React from 'react';
import './ChartTooltip.css';

/**
 * Single home for chart tooltips (DRY): raised pane, hairline border,
 * hard shadow, mono. Content via children; optional uppercase head row.
 */
export function ChartTooltip({ head, children }: { head?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="chart-tooltip">
      {head && <div className="chart-tooltip-head">{head}</div>}
      <div className="chart-tooltip-body">{children}</div>
    </div>
  );
}
