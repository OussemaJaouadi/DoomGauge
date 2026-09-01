import React, { useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartTokens } from './tokens';
import './HourlyBars.css';

interface HourItem { hour: number; label: string; youtube: number; instagram: number; facebook: number; total: number; }

function HourTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  const row = payload[0]?.payload as HourItem;
  if (!row) return null;
  return (
    <div className="hour-tooltip">
      <div className="hour-tooltip-title">{label}:00 · {row.total} reels</div>
      <div className="hour-tooltip-grid">
        <span className="hour-dot" style={{background: chartTokens.platform.youtube}} />YT {row.youtube}
        <span className="hour-dot" style={{background: chartTokens.platform.instagram}} />IG {row.instagram}
        <span className="hour-dot" style={{background: chartTokens.platform.facebook}} />FB {row.facebook}
      </div>
    </div>
  );
}

function makeMock(): HourItem[] {
  // peaks at 12-14 lunch and 21-23 night, valleys 9-11 focused
  const pattern = [0,0,0,0,0,0,1,2,1,0,0,1,3,8,6,2,1,2,3,5,8,10,7,4];
  return pattern.map((total, h)=>{
    const yt = Math.floor(total*0.5);
    const fb = Math.floor(total*0.2);
    const ig = total - yt - fb;
    return { hour:h, label: `${String(h).padStart(2,'0')}`, youtube: yt, instagram: ig, facebook: fb, total };
  });
}

export default function HourlyBars() {
  const [visible, setVisible] = useState({ youtube: true, instagram: true, facebook: true, total: true });
  const toggle = (k: keyof typeof visible) => setVisible(v=>({...v, [k]: !v[k]}));
  const data = makeMock();
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
            {visible.youtube && <Bar dataKey="youtube" stackId="a" fill={chartTokens.platform.youtube} radius={[0,0,0,0]} isAnimationActive={false} barSize={12} />}
            {visible.instagram && <Bar dataKey="instagram" stackId="a" fill={chartTokens.platform.instagram} isAnimationActive={false} />}
            {visible.facebook && <Bar dataKey="facebook" stackId="a" fill={chartTokens.platform.facebook} radius={[2,2,0,0]} isAnimationActive={false} />}
            {visible.total && <Line type="monotone" dataKey="total" stroke={chartTokens.accentGreen} strokeWidth={2.5} strokeOpacity={1} dot={{ r: 2, fill: chartTokens.accentGreen, stroke: chartTokens.bgRoot, strokeWidth: 1 }} activeDot={{ r: 4, stroke: chartTokens.accentGreen }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="hourly-legend">
        <button className={`hourly-legend-item ${visible.youtube?'':'off'}`} onClick={()=>toggle('youtube')} type="button"><span className="hour-dot" style={{background: chartTokens.platform.youtube}} />YT</button>
        <button className={`hourly-legend-item ${visible.instagram?'':'off'}`} onClick={()=>toggle('instagram')} type="button"><span className="hour-dot" style={{background: chartTokens.platform.instagram}} />IG</button>
        <button className={`hourly-legend-item ${visible.facebook?'':'off'}`} onClick={()=>toggle('facebook')} type="button"><span className="hour-dot" style={{background: chartTokens.platform.facebook}} />FB</button>
        <button className={`hourly-legend-item ${visible.total?'':'off'}`} onClick={()=>toggle('total')} type="button"><span className="hour-dot" style={{background: chartTokens.accentGreen}} />Total</button>
      </div>
      <div className="hint">Peaks 12-14h & 21-23h · Valleys 09-11h focused</div>
    </div>
  );
}
