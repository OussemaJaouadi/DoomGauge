import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '../ui/KpiCard';
import { ChartTooltip } from '../ui/ChartTooltip';
import { platformMeta } from '../platformMeta';
import { chartTokens, chartTheme } from '../tokens';
import { formatTime } from '../../utils/time';
import { PLATFORMS } from '../../types/models';
import type { Platform } from '../../types/models';
import type { DayRollup, TelemetryEvent, TimeRange } from '../../types/telemetry';
import { buildHourlyTrajectory } from '../../utils/telemetry';

interface MacroTrajectoryProps {
  rollups: DayRollup[];
  visible: Record<Platform, boolean>;
  events?: TelemetryEvent[];
  range?: TimeRange;
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

export function MacroTrajectory({ rollups, visible, events, range }: MacroTrajectoryProps) {
  const dates = [...new Set(rollups.map((r) => r.date))].sort();
  const isHourly = range === 'day' || (dates.length <= 1 && !!events);

  const rows: { date: string; youtube: number; instagram: number; facebook: number; total: number }[] = isHourly && events
    ? buildHourlyTrajectory(events, visible)
    : dates.map((date) => {
        const row = { date: shortDate(date), youtube: 0, instagram: 0, facebook: 0, total: 0 };
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
    if (isHourly && events) {
      const pEvents = events.filter((e) => e.platform === p);
      return {
        platform: p,
        timeMs: pEvents.reduce((s, e) => s + e.durationMs, 0),
        reels: pEvents.length,
        skips: pEvents.filter((e) => e.skipped).length,
      };
    }
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
      <div className="lens-title">
        {isHourly ? 'HOURLY TRAJECTORY — 24h distribution + volume' : 'MACRO TRAJECTORY — volume + attention debt'}
      </div>
      <div className="lens-chart">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barCategoryGap={isHourly ? '16%' : '28%'}
          >
            <CartesianGrid stroke={chartTheme.grid.stroke} strokeDasharray={chartTheme.grid.strokeDasharray} opacity={chartTheme.grid.strokeOpacity} vertical={false} />
            <XAxis
              dataKey="date"
              tick={chartTheme.tick}
              axisLine={chartTheme.axisLine}
              tickLine={false}
              interval={isHourly ? 1 : undefined}
            />
            <YAxis tick={chartTheme.tick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
            <Tooltip content={<TrajectoryTooltip />} cursor={chartTheme.cursor} />
            {PLATFORMS.map((p) => visible[p] && (
              <Bar
                key={p}
                dataKey={p}
                name={platformMeta[p].label}
                stackId="a"
                fill={chartTokens.platform[p]}
                isAnimationActive={false}
                barSize={isHourly ? 14 : dates.length > 14 ? 10 : 18}
              />
            ))}
            <Line
              type="monotone"
              dataKey="total"
              name="Total (min)"
              stroke={chartTokens.accentGreen}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
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
