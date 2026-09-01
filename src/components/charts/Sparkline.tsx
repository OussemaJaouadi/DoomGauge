import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartTokens } from './tokens';
import './Sparkline.css';

type SeriesKey = 'total' | 'youtube' | 'instagram' | 'facebook';

interface SparklineProps {
  days?: string[];
  total: number[];
  youtube: number[];
  instagram: number[];
  facebook: number[];
}

const seriesMeta: Record<SeriesKey, { label: string; color: string }> = {
  total: { label: 'Total', color: chartTokens.accentGreen },
  youtube: { label: 'YouTube', color: chartTokens.platform.youtube },
  instagram: { label: 'Instagram', color: chartTokens.platform.instagram },
  facebook: { label: 'Facebook', color: chartTokens.platform.facebook },
};

const seriesOrder: SeriesKey[] = ['total', 'youtube', 'instagram', 'facebook'];

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

export default function Sparkline({ days, total, youtube, instagram, facebook }: SparklineProps) {
  const xLabels = days ?? total.map((_, i) => `D${i + 1}`);
  const data = xLabels.map((label, i) => ({
    label,
    total: total[i],
    youtube: youtube[i],
    instagram: instagram[i],
    facebook: facebook[i],
  }));
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    total: true, youtube: true, instagram: true, facebook: true,
  });
  const toggle = (k: SeriesKey) => setVisible(v=>({...v, [k]: !v[k]}));

  return (
    <div className="sparkline">
      <div className="sparkline-chart" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTokens.borderGrid} strokeDasharray="3 3" opacity={0.6} />
            <XAxis dataKey="label" tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 10 }} axisLine={{ stroke: chartTokens.borderSubtle }} tickLine={false} />
            <YAxis tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<SparkTooltip />} />
            {visible.total && <Line type="monotone" dataKey="total" name="Total" stroke={seriesMeta.total.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />}
            {visible.youtube && <Line type="monotone" dataKey="youtube" name="YouTube" stroke={seriesMeta.youtube.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />}
            {visible.instagram && <Line type="monotone" dataKey="instagram" name="Instagram" stroke={seriesMeta.instagram.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />}
            {visible.facebook && <Line type="monotone" dataKey="facebook" name="Facebook" stroke={seriesMeta.facebook.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="sparkline-legend">
        {seriesOrder.map((k) => (
          <button key={k} className={`sparkline-legend-item ${visible[k] ? '' : 'legend-off'}`} onClick={() => toggle(k)} type="button">
            <span className="sparkline-dot" style={{ background: seriesMeta[k].color }} />
            {seriesMeta[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}
