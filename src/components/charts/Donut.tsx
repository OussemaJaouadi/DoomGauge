// React & 3rd-party
import React, { type ReactNode } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

// Types
import type { ChartMode, ChartItem } from '../../types/models';

// UI Components
import { ChartTooltip } from '../ui/ChartTooltip';
import { Hint } from '../ui/Hint';

// Utilities & Helpers
import { formatTime } from '../../utils/time';
import { hintFacts } from '../ui/hintContent';

// Styles
import './Donut.css';

function DonutTooltip({ active, payload, mode }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as ChartItem & { value: number; pct: number };
  return (
    <ChartTooltip head={<><span className="dot" style={{ background: d.color }} />{d.label} · {d.pct}%</>}>
      {mode === 'time' ? <span>{formatTime(d.timeMs)}</span> : <span>{d.count} reels</span>}
    </ChartTooltip>
  );
}

/** The adjacent actionable rows are the donut's accessible legend and values. */
export function Donut({ items, mode, onModeChange, children }: {
  items: ChartItem[];
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  children: ReactNode;
}) {
  const total = mode === 'time' ? items.reduce((s, i) => s + i.timeMs, 0) : items.reduce((s, i) => s + i.count, 0);
  const data = items.map(item => {
    const v = mode === 'time' ? item.timeMs : item.count;
    return { ...item, value: v, pct: total > 0 ? Math.round((v / total) * 100) : 0 };
  });

  return (
    <section className="popup-share" aria-label="Platform contribution">
      <div className="popup-share-head">
        <div className="popup-share-title-group">
          <h2>Share of total {mode === 'time' ? 'time' : 'reels'}</h2>
          <Hint
            label="About platform share"
            text={hintFacts([
              ['Formula', 'Platform / today’s total'],
              ['Basis', mode === 'time' ? 'Active viewing time' : 'Reels viewed'],
            ])}
            accent="blue"
          />
        </div>
        <div className="popup-share-toggle" role="group" aria-label="Share measurement">
          <button type="button" aria-pressed={mode === 'time'} onClick={() => onModeChange('time')}>Time</button>
          <button type="button" aria-pressed={mode === 'count'} onClick={() => onModeChange('count')}>Count</button>
        </div>
      </div>
      <div className="popup-share-body">
        <div className="popup-share-donut">
          <>{total === 0 ? <span className="donut-unavailable" role="img" aria-label="Platform shares unavailable: no activity">—</span> : <PieChart width={108} height={108}>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={34}
              outerRadius={51}
              paddingAngle={2}
              stroke="var(--bg-root)"
              strokeWidth={1}
              isAnimationActive={false}
            >
              {data.map(item => (
                <Cell key={item.platform} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip mode={mode} />} />
          </PieChart>}</>
        </div>
        {children}
      </div>
    </section>
  );
}
