// React & 3rd-party
import React, { useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
import type { HourItem } from '../../types/models';
import { PLATFORMS } from '../../types/models';

// Styles & Tokens
import { chartTokens } from '../tokens';
import { ChartTooltip } from '../ui/ChartTooltip';
import { platformMeta } from '../platformMeta';
import './HourlyBars.css';

function HourTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  const row = payload[0]?.payload as HourItem;
  if (!row) return null;
  return (
    <ChartTooltip head={`${label}:00 · ${row.total} reels`}>
      <>
        {PLATFORMS.map(p => (
          <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="hour-dot" style={{ background: chartTokens.platform[p] }} />
            {platformMeta[p].icon} {platformMeta[p].label} {row[p]}
          </span>
        ))}
      </>
    </ChartTooltip>
  );
}

export default function HourlyBars({ data }: { data: HourItem[] }) {
  const [visible, setVisible] = useState(() => {
    const v: Record<string, boolean> = { total: true };
    PLATFORMS.forEach(p => (v[p] = true));
    return v;
  });
  const toggle = (k: string) => setVisible(v => ({ ...v, [k]: !v[k] }));

  return (
    <div className="hourly">
      <div className="hourly-head">
        <span className="hourly-title">Today by hour · reels</span>
        <span className="hourly-sub">Click a legend to toggle</span>
      </div>

      <div className="hourly-chart">
        <ResponsiveContainer width="100%" height={148}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid stroke={chartTokens.borderGrid} strokeDasharray="3 3" opacity={0.6} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTokens.textSecondary, fontFamily: chartTokens.fontMono, fontSize: 11 }} axisLine={{ stroke: chartTokens.borderSubtle }} tickLine={false} interval={2} />
            <YAxis tick={{ fill: chartTokens.textSecondary, fontFamily: chartTokens.fontMono, fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip content={<HourTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            {PLATFORMS.map(p => {
              const topVisible = [...PLATFORMS].reverse().find(pf => visible[pf]);
              return visible[p] && (
                <Bar
                  key={p}
                  dataKey={p}
                  stackId="a"
                  fill={chartTokens.platform[p]}
                  fillOpacity={visible.total ? 0.75 : 0.9}
                  isAnimationActive={false}
                  barSize={12}
                  radius={p === topVisible ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                />
              );
            })}
            {visible.total && (
              <Line
                type="monotone"
                dataKey="total"
                stroke={chartTokens.allPlatforms}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="hourly-legend">
        {PLATFORMS.map(p => (
          <button
            key={p}
            className={`hourly-legend-item ${visible[p] ? '' : 'off'}`}
            onClick={() => toggle(p)}
            type="button"
            aria-pressed={visible[p]}
          >
            <span className="hour-dot" style={{ background: chartTokens.platform[p] }} />
            {platformMeta[p].icon} {platformMeta[p].label}
          </button>
        ))}
        <button
          className={`hourly-legend-item ${visible.total ? '' : 'off'}`}
          onClick={() => toggle('total')}
          type="button"
          aria-pressed={visible.total}
        >
          <span className="hour-dot" style={{ background: chartTokens.allPlatforms }} />
          All platforms
        </button>
      </div>
    </div>
  );
}
