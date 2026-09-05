// React & 3rd-party
import React, { useState } from 'react';
import { MonitorPlay, Camera, MessageCircle } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
import type { HourItem, Platform } from '../../types/models';
import { PLATFORMS } from '../../types/models';

// Styles & Tokens
import { chartTokens } from '../tokens';
import './HourlyBars.css';

const platformLabel: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

const platformIcon: Record<Platform, React.ReactNode> = {
  youtube: <MonitorPlay size={10} />,
  instagram: <Camera size={10} />,
  facebook: <MessageCircle size={10} />,
};

function HourTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  const row = payload[0]?.payload as HourItem;
  if (!row) return null;
  return (
    <div className="hour-tooltip">
      <div className="hour-tooltip-title">{label}:00 · {row.total} reels</div>
      <div className="hour-tooltip-grid">
        {PLATFORMS.map(p => (
          <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="hour-dot" style={{ background: chartTokens.platform[p] }} />
            {platformIcon[p]} {platformLabel[p]} {row[p]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HourlyBars({ data }: { data: HourItem[] }) {
  const [visible, setVisible] = useState(() => {
    const v: Record<string, boolean> = { total: true };
    PLATFORMS.forEach(p => v[p] = true);
    return v;
  });
  const toggle = (k: string) => setVisible(v=>({...v, [k]: !v[k]}));

  return (
    <div className="hourly">
      <div className="hourly-head">
        <span className="hourly-title">Today — hourly</span>
        <span className="hourly-title" style={{color:'var(--text-secondary)', fontSize:'0.58rem'}}>tap legend to scope</span>
      </div>
      
      <div className="hourly-chart">
        <ResponsiveContainer width="100%" height={148}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid stroke={chartTokens.borderGrid} strokeDasharray="3 3" opacity={0.6} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 9 }} axisLine={{ stroke: chartTokens.borderSubtle }} tickLine={false} interval={2} />
            <YAxis tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip content={<HourTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            {PLATFORMS.map(p => {
              const topVisible = [...PLATFORMS].reverse().find(pf => visible[pf]);
              return visible[p] && (
                <Bar 
                  key={p} 
                  dataKey={p} 
                  stackId="a" 
                  fill={chartTokens.platform[p]} 
                  isAnimationActive={false} 
                  barSize={12} 
                  radius={p === topVisible ? [2, 2, 0, 0] : [0, 0, 0, 0]} 
                />
              );
            })}
            {visible.total && <Line type="monotone" dataKey="total" stroke={chartTokens.accentGreen} strokeWidth={2.5} strokeOpacity={1} dot={{ r: 2, fill: chartTokens.accentGreen, stroke: chartTokens.bgRoot, strokeWidth: 1 }} activeDot={{ r: 4, stroke: chartTokens.accentGreen }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="hourly-legend">
        {PLATFORMS.map(p => (
          <button key={p} className={`hourly-legend-item ${visible[p]?'':'off'}`} onClick={()=>toggle(p)} type="button" aria-pressed={visible[p]}>
            <span className="hour-dot" style={{background: chartTokens.platform[p]}} />
            {platformIcon[p]} {platformLabel[p]}
          </button>
        ))}
        <button className={`hourly-legend-item ${visible.total?'':'off'}`} onClick={()=>toggle('total')} type="button"><span className="hour-dot" style={{background: chartTokens.accentGreen}} />Total</button>
      </div>
    </div>
  );
}
