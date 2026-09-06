import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '../ui/KpiCard';
import { ChartTooltip } from '../ui/ChartTooltip';
import { platformMeta } from '../platformMeta';
import { chartTokens, chartTheme } from '../tokens';
import { formatTime } from '../../utils/time';
import { PLATFORMS } from '../../types/models';
import type { Platform } from '../../types/models';
import type { DayRollup } from '../../types/telemetry';

interface MacroTrajectoryProps {
  rollups: DayRollup[];
  visible: Record<Platform, boolean>;
}

function shortDate(date: string): string {
  return date.slice(5).replace('-', '/');
}

function TrajectoryTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <ChartTooltip head={`${label}`}>
      <>
        {payload.map((p: any) => (
          <span key={p.dataKey}>
            {p.name}: <strong>{p.value}m</strong>
          </span>
        ))}
      </>
    </ChartTooltip>
  );
}

export function MacroTrajectory({ rollups, visible }: MacroTrajectoryProps) {
  const dates = [...new Set(rollups.map((r) => r.date))].sort();
  const rows = dates.map((date) => {
    const row: Record<string, string | number> = { date: shortDate(date) };
    let total = 0;
    for (const p of PLATFORMS) {
      const r = rollups.find((x) => x.date === date && x.platform === p);
      const mins = r ? Math.round(r.totalActiveMs / 60000) : 0;
      row[p] = visible[p] ? mins : 0;
      if (visible[p]) total += mins;
    }
    row.total = total;
    return row;
  });

  const totals = PLATFORMS.map((p) => {
    const rs = rollups.filter((r) => r.platform === p);
    return {
      platform: p,
      timeMs: rs.reduce((s, r) => s + r.totalActiveMs, 0),
      reels: rs.reduce((s, r) => s + r.reelCount, 0),
      skips: rs.reduce((s, r) => s + r.skipCount, 0),
    };
  }).filter((t) => visible[t.platform]);

  return (
    <div className="lens-panel">
      <div className="lens-title">MACRO TRAJECTORY — volume + attention debt</div>
      <div className="lens-chart">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke={chartTheme.grid.stroke} strokeDasharray={chartTheme.grid.strokeDasharray} opacity={chartTheme.grid.strokeOpacity} vertical={false} />
            <XAxis dataKey="date" tick={chartTheme.tick} axisLine={chartTheme.axisLine} tickLine={false} />
            <YAxis tick={chartTheme.tick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
            <Tooltip content={<TrajectoryTooltip />} cursor={chartTheme.cursor} />
            {PLATFORMS.map((p) => visible[p] && (
              <Bar key={p} dataKey={p} name={platformMeta[p].label} stackId="a" fill={chartTokens.platform[p]} isAnimationActive={false} barSize={18} />
            ))}
            <Line type="monotone" dataKey="total" name="Total (min)" stroke={chartTokens.accentGreen} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="lens-grid3">
        {totals.map((t) => (
          <KpiCard
            key={t.platform}
            icon={platformMeta[t.platform].icon}
            label={platformMeta[t.platform].label}
            value={formatTime(t.timeMs)}
            sublabel={`${t.reels} reels · ${t.skips} skipped`}
            accent={t.platform === 'youtube' ? 'yt' : t.platform === 'instagram' ? 'ig' : 'fb'}
          />
        ))}
      </div>
    </div>
  );
}
