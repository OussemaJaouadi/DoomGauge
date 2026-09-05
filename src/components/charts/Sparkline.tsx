// React & 3rd-party
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
import { PLATFORMS } from '../../types/models';

// Styles & Tokens
import { chartTokens } from '../tokens';
import './Sparkline.css';

interface SparklineProps {
  days?: string[];
  total: number[];
  [key: string]: any;
}

function SparkTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="sparkline-tooltip">
      <div className="sparkline-tooltip-title">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="sparkline-tooltip-row">
          <span className="sparkline-dot" style={{ background: p.color }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

export default function Sparkline({ days, total, ...platformSeries }: SparklineProps) {
  const xLabels = days ?? total.map((_, i) => `D${i + 1}`);
  
  const data = xLabels.map((label, i) => {
    const row: any = { label, total: total[i] };
    PLATFORMS.forEach(p => {
      row[p] = platformSeries[p]?.[i] ?? 0;
    });
    return row;
  });

  const [visible, setVisible] = useState(() => {
    const v: Record<string, boolean> = { total: true };
    PLATFORMS.forEach(p => v[p] = true);
    return v;
  });

  const toggle = (k: string) => setVisible(v=>({...v, [k]: !v[k]}));

  return (
    <div className="sparkline">
      <div className="sparkline-chart" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTokens.borderGrid} strokeDasharray="3 3" opacity={0.6} />
            <XAxis dataKey="label" tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 10 }} axisLine={{ stroke: chartTokens.borderSubtle }} tickLine={false} />
            <YAxis tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<SparkTooltip />} />
            {visible.total && <Line type="monotone" dataKey="total" name="Total" stroke={chartTokens.accentGreen} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />}
            {PLATFORMS.map(p => visible[p] && (
              <Line 
                key={p} 
                type="monotone" 
                dataKey={p} 
                name={p.charAt(0).toUpperCase() + p.slice(1)} 
                stroke={chartTokens.platform[p]} 
                strokeWidth={2} 
                dot={{ r: 3 }} 
                activeDot={{ r: 4 }} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="sparkline-legend">
        <button className={`sparkline-legend-item ${visible.total ? '' : 'legend-off'}`} onClick={() => toggle('total')} type="button">
          <span className="sparkline-dot" style={{ background: chartTokens.accentGreen }} />
          Total
        </button>
        {PLATFORMS.map(p => (
          <button key={p} className={`sparkline-legend-item ${visible[p] ? '' : 'legend-off'}`} onClick={() => toggle(p)} type="button">
            <span className="sparkline-dot" style={{ background: chartTokens.platform[p] }} />
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
