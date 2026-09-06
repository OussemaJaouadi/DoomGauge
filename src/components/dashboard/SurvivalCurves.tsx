import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { platformMeta } from '../platformMeta';
import { chartTokens, chartTheme } from '../tokens';
import { ChartTooltip } from '../ui/ChartTooltip';
import { kmCurve } from '../../utils/telemetry';
import { PLATFORMS } from '../../types/models';
import type { Platform } from '../../types/models';
import type { TelemetryEvent } from '../../types/telemetry';

interface SurvivalCurvesProps {
  events: TelemetryEvent[];
}

const T_MAX = 60;

function SurvivalTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <ChartTooltip head={`${label}s survived`}>
      <>
        {payload.map((p: any) => (
          <span key={p.dataKey}>
            {p.name}: <strong>{Math.round(p.value * 100)}%</strong>
          </span>
        ))}
      </>
    </ChartTooltip>
  );
}

export function SurvivalCurves({ events }: SurvivalCurvesProps) {
  const curves = PLATFORMS.map((p: Platform) => ({
    platform: p,
    ...kmCurve(events.filter((e) => e.platform === p)),
  }));

  const rows = Array.from({ length: T_MAX + 1 }, (_, t) => {
    const row: Record<string, number | null> = { t };
    for (const c of curves) {
      let s: number | null = null;
      for (const pt of c.points) {
        if (pt.t <= t) s = pt.s;
        else break;
      }
      row[c.platform] = s;
    }
    return row;
  });

  return (
    <div className="lens-panel">
      <div className="lens-title">SURVIVAL DECAY — Kaplan-Meier S(t) per channel</div>
      <div className="lens-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid.stroke} strokeDasharray={chartTheme.grid.strokeDasharray} opacity={chartTheme.grid.strokeOpacity} vertical={false} />
            <XAxis dataKey="t" tick={chartTheme.tick} axisLine={chartTheme.axisLine} tickLine={false} tickFormatter={(t: number) => `${t}s`} />
            <YAxis domain={[0, 1]} tick={chartTheme.tick} axisLine={false} tickLine={false} width={30} tickFormatter={(s: number) => `${Math.round(s * 100)}%`} />
            <Tooltip content={<SurvivalTooltip />} cursor={{ stroke: chartTokens.borderSubtle }} />
            {curves.map((c) => (
              <Line key={c.platform} type="stepAfter" dataKey={c.platform} name={platformMeta[c.platform].label} stroke={chartTokens.platform[c.platform]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            ))}
            {curves.map((c) => c.tCliff !== null && (
              <ReferenceDot key={`${c.platform}-cliff`} x={Math.min(c.tCliff, T_MAX)} y={0.3} r={4} fill={chartTokens.threatRed} stroke="none" />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="lens-readouts">
        {curves.map((c) => (
          <div key={c.platform} className="lens-readout">
            <span style={{ color: chartTokens.platform[c.platform], fontWeight: 700 }}>{platformMeta[c.platform].label}</span>
            <span>CLIFF {c.tCliff !== null ? `${c.tCliff.toFixed(1)}s` : '—'}</span>
            <span>LOCK-IN {c.tLock !== null ? `${c.tLock.toFixed(1)}s` : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
