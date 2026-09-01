import React from 'react';
import { ArrowLeft, Clock, Hash, Zap, Timer } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartTokens } from '../charts/tokens';
import './PlatformDetail.css';

type Platform = 'youtube'|'instagram'|'facebook';

const meta: Record<Platform, { label: string; color: string; accent: 'yt'|'ig'|'fb' }> = {
  youtube: { label: 'YouTube', color: '#ff3344', accent: 'yt' },
  instagram: { label: 'Instagram', color: '#a855f7', accent: 'ig' },
  facebook: { label: 'Facebook', color: '#00b4d8', accent: 'fb' },
};

const platformMock: Record<Platform, { count:number; timeMs:number; skip:number; avgFlick:number; velocity:string; share: number; earlyExit: string; hourly:number[] }> = {
  youtube: { count: 23, timeMs: 1120000, skip: 14, avgFlick: 1.1, velocity: '1.2', share: 37, earlyExit: '3/18 · 17%', hourly: [0,0,0,0,0,0,0,1,1,0,0,1,2,5,3,1,0,1,1,2,3,5,4,1] },
  instagram: { count: 15, timeMs: 730000, skip: 11, avgFlick: 0.9, velocity: '1.8', share: 28, earlyExit: '5/12 · 42%', hourly: [0,0,0,0,0,0,1,1,0,0,0,0,1,2,2,1,0,1,2,2,3,4,2,1] },
  facebook: { count: 9, timeMs: 485000, skip: 4, avgFlick: 1.6, velocity: '0.9', share: 18, earlyExit: '1/7 · 14%', hourly: [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,1,2] },
};

function formatTime(ms:number){ const s=Math.floor(ms/1000); const m=Math.floor(s/60); const sec=s%60; if(m>=60){const h=Math.floor(m/60);const min=m%60;return `${h}h ${min}m`;} if(m>0) return `${m}m ${sec}s`; return `${sec}s`; }

export function PlatformDetail({ platform, onBack }: { platform: Platform; onBack: ()=>void }) {
  const m = meta[platform];
  const d = platformMock[platform];
  const of10 = Math.round((d.skip/d.count)*10);
  const hourlyData = d.hourly.map((v,i)=>({ label: String(i).padStart(2,'0'), value: v }));

  return (
    <div className="platform-detail">
      <button className="detail-back" onClick={onBack} type="button"><ArrowLeft size={14} /> Back to Today</button>
      <div className="detail-header" style={{ borderColor: m.color }}>
        <span className="detail-dot" style={{ background: m.color }} />
        <span className="detail-title" style={{ color: m.color }}>{m.label}</span>
        <span className="detail-sub">· TODAY · {d.share}% of day</span>
      </div>

      <div className="detail-hero">
        <KpiCard icon={<Clock size={14}/>} label="Active Time" value={formatTime(d.timeMs)} accent={m.accent} sublabel="today" />
        <KpiCard icon={<Hash size={14}/>} label="Reel Count" value={d.count} accent={m.accent} sublabel="today" />
      </div>

      <div className="detail-grid3">
        <KpiCard icon={<Zap size={14}/>} label="Impatience" value={`${Math.round(d.skip/d.count*100)}%`} unit={`${of10}/10`} accent="magenta" sublabel="bailed <3s" />
        <KpiCard icon={<Timer size={14}/>} label="Velocity" value={d.velocity} unit="/min" accent="magenta" sublabel="speed" />
        <KpiCard icon={<Clock size={14}/>} label="Avg flick" value={`${d.avgFlick}s`} accent="magenta" sublabel="reflex" />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Bailed in 3 seconds</div>
        <div className="filmstrip" aria-label={`${d.skip} of ${d.count} flicked`}>
          {Array.from({length:10},(_,i)=> (
            <span key={i} className="film-cell" style={{ background: i<of10? m.color : 'transparent', borderColor: i<of10? m.color : 'var(--border-subtle)', opacity: i<of10?1:0.5 }} />
          ))}
          <span className="film-label">{of10}/10</span>
        </div>
        <div className="detail-meta">{d.skip} of {d.count} bailed · {d.count-d.skip} watched</div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Today — hourly</div>
        <div className="detail-chart">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={hourlyData} margin={{top:8,right:8,left:0,bottom:0}} barCategoryGap="24%">
              <CartesianGrid stroke={chartTokens.borderGrid} strokeDasharray="3 3" opacity={0.6} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 9 }} axisLine={{ stroke: chartTokens.borderSubtle }} tickLine={false} interval={3} />
              <YAxis tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 10 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }} />
              <Bar dataKey="value" fill={m.color} radius={[2,2,0,0]} isAnimationActive={false} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="hint">Peaks 12-14 & 21-23 · Valleys 09-11 focused</div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Early exit · watch &lt;50%</div>
        <div className="detail-meta">{d.earlyExit} where length known · avg watch 34% — bailed before half</div>
      </div>
    </div>
  );
}
