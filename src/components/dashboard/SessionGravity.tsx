import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '../ui/KpiCard';
import { ChartTooltip } from '../ui/ChartTooltip';
import { chartTokens, chartTheme } from '../tokens';
import { formatTime } from '../../utils/time';
import { fanoFactor, findRunaways, interArrivalGaps, splitSessions } from '../../utils/telemetry';
import { platformMeta } from '../platformMeta';
import type { TelemetryEvent } from '../../types/telemetry';

interface SessionGravityProps {
  events: TelemetryEvent[];
}

function GravityTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as { startTime: number; durationMs: number };
  return (
    <ChartTooltip head={new Date(d.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}>
      <span>
        <strong>{Math.round(d.durationMs / 60000)}m</strong> session
      </span>
    </ChartTooltip>
  );
}

export function SessionGravity({ events }: SessionGravityProps) {
  const sessions = splitSessions(events).map((s) => ({
    startTime: s.startTs,
    durationMs: s.endTs - s.startTs,
  }));
  const fano = fanoFactor(interArrivalGaps(events));
  const runaways = findRunaways(events);

  return (
    <div className="lens-panel">
      <div className="lens-title">SESSION GRAVITY — inter-arrival dispersion & continuous runs</div>
      <div className="lens-grid3">
        <KpiCard label="Fano Factor" value={fano !== null ? fano.toFixed(1) : '—'} sublabel={fano !== null && fano > 5 ? 'high burst variance' : 'uniform pacing'} accent={fano !== null && fano > 5 ? 'threat' : 'green'} />
        <KpiCard label="Runaways" value={runaways.length} sublabel="idle >45m then >15m continuous" accent={runaways.length > 0 ? 'threat' : 'default'} />
        <KpiCard label="Sessions" value={sessions.length} sublabel="45m idle split" accent="default" />
      </div>
      <div className="lens-chart">
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chartTheme.grid.stroke} strokeDasharray={chartTheme.grid.strokeDasharray} opacity={chartTheme.grid.strokeOpacity} vertical={false} />
            <XAxis
              type="number"
              dataKey="startTime"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              tick={chartTheme.tick}
              axisLine={chartTheme.axisLine}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="durationMs"
              tickFormatter={(ms) => `${Math.round(ms / 60000)}m`}
              tick={chartTheme.tick}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<GravityTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Sessions" data={sessions} fill={chartTokens.accentGreen} shape="square" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="lens-list">
        {runaways.slice(0, 8).map((r) => (
          <div key={r.startTs} className="lens-row">
            <span style={{ color: platformMeta[r.gateway].color, fontWeight: 700 }}>{platformMeta[r.gateway].label}</span>
            <span>{new Date(r.startTs).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span>{r.reels} reels</span>
            <span>{formatTime(r.spanMin * 60000)} (+{formatTime(r.overrunMin * 60000)} over)</span>
          </div>
        ))}
        {runaways.length === 0 && <div className="lens-note">No cold-start runaways in this slice.</div>}
      </div>
    </div>
  );
}
