// React & 3rd-party
import React, { useState } from 'react';
import { ArrowLeft, Clock, Hash, Zap, Timer } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Components
import { KpiCard } from '../ui/KpiCard';

// Utils & Data
import { formatTime } from '../../utils/time';
import { avgFlickSec, skipDiagnostics } from '../../utils/metrics';

// Types
import type { Platform, PlatformStats } from '../../types/models';

// Styles & Tokens
import { chartTokens } from '../tokens';
import './PlatformDetail.css';

function DetailHourTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div style={{
      background: 'var(--bg-surface-raised)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '4px',
      padding: '4px 8px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.68rem',
      color: 'var(--text-primary)',
    }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}:00</span> · <span style={{ fontWeight: 700 }}>{val} reels</span>
    </div>
  );
}

export function PlatformDetail({ platform, data: d, onBack }: { platform: Platform; data: PlatformStats; onBack: ()=>void }) {
  const [showBars, setShowBars] = useState(true);
  const [showLine, setShowLine] = useState(true);

  const toggleBars = () => setShowBars(prev => (prev && !showLine ? prev : !prev));
  const toggleLine = () => setShowLine(prev => (!showBars && prev ? prev : !prev));

  const pName = platform.charAt(0).toUpperCase() + platform.slice(1);
  const color = chartTokens.platform[platform];
  const lineColor = chartTokens.accentGreen;
  const accent = platform === 'youtube' ? 'yt' : platform === 'instagram' ? 'ig' : 'fb';

  const { pct: skipPct, of10: fill } = skipDiagnostics(d.skip, d.count);
  const flick = avgFlickSec(d.timeMs, d.count);
  const hourlyData = d.hourly.map((v,i)=>({ label: String(i).padStart(2,'0'), value: v }));

  return (
    <div className="platform-detail">
      <button className="detail-back" onClick={onBack} type="button"><ArrowLeft size={14} /> Back to Today</button>
      <div className="detail-header" style={{ borderColor: color }}>
        <span className="detail-dot" style={{ background: color }} />
        <span className="detail-title" style={{ color: color }}>{pName}</span>
        <span className="detail-sub">{d.share}% elapsed burn</span>
      </div>

      <div className="detail-hero">
        <KpiCard icon={<Clock size={14}/>} label="Active Time" value={formatTime(d.timeMs)} accent={accent} />
        <KpiCard icon={<Hash size={14}/>} label="Reel Count" value={d.count} accent={accent} />
      </div>

      <div className="detail-grid3">
        <KpiCard icon={<Zap size={14}/>} label="Impatience" value={`${skipPct}%`} unit={`${fill}/10`} accent="magenta" />
        <KpiCard icon={<Timer size={14}/>} label="Velocity" value={d.velocity} unit="/min" accent="magenta" />
        <KpiCard icon={<Clock size={14}/>} label="Avg flick" value={`${flick}s`} accent="magenta" />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">ABANDONMENT TELEMETRY</div>
        <div className="detail-meta">BAILED &lt;3s · {d.skip}/{d.count}</div>
        <div className="filmstrip">
          {Array.from({length:10},(_,i)=> (
            <span key={i} className="film-cell" style={{ background: i<fill? color : 'transparent', borderColor: i<fill? color : 'var(--border-subtle)', opacity: i<fill?1:0.5 }} />
          ))}
        </div>
        <div className="detail-meta">EARLY EXIT · {d.earlyExit} abandoned before 50%</div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>HOURLY DISTRIBUTION (TODAY)</span>
          <div className="detail-chart-toggles">
            <button
              type="button"
              className={`chart-pill ${showBars ? '' : 'off'}`}
              onClick={toggleBars}
              aria-pressed={showBars}
            >
              <span className="dot" style={{ background: color }} />
              Reels
            </button>
            <button
              type="button"
              className={`chart-pill ${showLine ? '' : 'off'}`}
              onClick={toggleLine}
              aria-pressed={showLine}
            >
              <span className="dot" style={{ background: lineColor }} />
              Wave
            </button>
          </div>
        </div>
        <div className="detail-chart">
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={hourlyData} margin={{top:8,right:8,left:0,bottom:0}} barCategoryGap="24%">
              <CartesianGrid stroke={chartTokens.borderGrid} strokeDasharray="3 3" opacity={0.6} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 9 }} axisLine={{ stroke: chartTokens.borderSubtle }} tickLine={false} interval={3} />
              <YAxis tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 10 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip content={<DetailHourTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              {showBars && (
                <Bar dataKey="value" fill={color} fillOpacity={0.65} radius={[2,2,0,0]} isAnimationActive={false} barSize={10} />
              )}
              {showLine && (
                <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} strokeOpacity={0.9} dot={{ r: 2, fill: lineColor, stroke: chartTokens.bgRoot, strokeWidth: 1 }} activeDot={{ r: 4, stroke: lineColor }} isAnimationActive={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
