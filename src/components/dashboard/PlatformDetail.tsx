import { measurementHints } from '../ui/hintContent';
// React & 3rd-party
import { useState } from 'react';
import { ArrowLeft, Clock, Hash, Zap, Activity } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Components
import { KpiCard } from '../ui/KpiCard';
import { Hint } from '../ui/Hint';
import { platformMeta } from '../platformMeta';

// Utils & Data
import { formatTime } from '../../utils/time';
import { avgFlickSec, skipDiagnostics } from '../../utils/metrics';

// Types
import type { Platform, PlatformStats } from '../../types/models';

// Styles & Tokens
import { chartTokens } from '../tokens';
import './PlatformDetail.css';

interface DetailHourTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function DetailHourTooltip({ active, payload, label }: DetailHourTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="detail-tooltip">
      <span className="detail-tooltip-time">{label}:00</span> · <span className="detail-tooltip-val">{val} reels</span>
    </div>
  );
}

export function PlatformDetail({
  platform,
  data: d,
  onBack,
  throughHour = 24,
}: {
  platform: Platform;
  data: PlatformStats;
  onBack: () => void;
  throughHour?: number;
}) {
  const meta = platformMeta[platform];
  const pName = meta.label;
  const color = chartTokens.platform[platform];
  const lineColor = chartTokens.accentAmber;
  const accent = platform === 'youtube' ? 'yt' : platform === 'instagram' ? 'ig' : 'fb';

  const { pct: skipPct, of10: fill } = skipDiagnostics(d.skip, d.count);
  const flick = avgFlickSec(d.timeMs, d.count);
  const hourlyData = d.hourly.slice(0, throughHour).map((v, i) => ({
    label: String(i).padStart(2, '0'),
    value: v,
  }));

  const [showBars, setShowBars] = useState(true);
  const [showLine, setShowLine] = useState(true);

  return (
    <div className="platform-detail">
      <button className="detail-back" onClick={onBack} type="button">
        <ArrowLeft size={14} /> Back to Today
      </button>

      <div className="detail-header" style={{ borderLeftColor: color }}>
        <span className="detail-icon" style={{ color }}>{meta.icon}</span>
        <span className="detail-title">{pName}</span>
        <span className="detail-sub">{d.share}% of total active time</span>
      </div>

      <div className="detail-hero">
        <KpiCard icon={<Clock size={14} />} label="Active Time" value={formatTime(d.timeMs)} accent={accent} />
        <KpiCard icon={<Hash size={14} />} label="Reel Count" value={d.count} accent={accent} />
      </div>

      <div className="detail-grid3">
        <KpiCard
          icon={<Zap size={13} />}
          label="Impatience"
          value={d.count ? `${skipPct}%` : '—'}
          unit={`${d.skip}/${d.count}`}
          accent="magenta"
        />
        <KpiCard
          icon={<Activity size={13} />}
          label="Velocity"
          value={d.velocity}
          unit="reels/min"
          accent="amber"
        />
        <KpiCard
          icon={<Clock size={13} />}
          label="Avg flick"
          value={d.count ? `${flick}s` : '—'}
          unit="per reel"
          accent="default"
        />
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <span className="detail-section-title">Abandonment telemetry</span>
          <Hint
            accent="neutral"
            label="How abandonment is measured"
            text={measurementHints.abandonment}
          />
        </div>

        <div className="abandonment-item">
          <div className="abandonment-row">
            <span className="abandonment-label">Bailed &lt;3s</span>
            <span className="abandonment-stat">{d.skip} / {d.count} reels</span>
          </div>
          <div className="detail-filmstrip" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                style={{ background: i < fill ? color : 'var(--border-subtle)' }}
              />
            ))}
          </div>
        </div>

        <div className="abandonment-item">
          <div className="abandonment-row">
            <span className="abandonment-label">Early exit (&lt;50%)</span>
            <span className="abandonment-stat">{d.earlyExit}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Today by hour · reels</div>
        <div className="detail-chart">
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={hourlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid stroke={chartTokens.borderGrid} strokeDasharray="3 3" opacity={0.6} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: chartTokens.textSecondary, fontFamily: chartTokens.fontMono, fontSize: 12 }}
                axisLine={{ stroke: chartTokens.borderSubtle }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: chartTokens.textSecondary, fontFamily: chartTokens.fontMono, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={24}
                allowDecimals={false}
              />
              <Tooltip content={<DetailHourTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              {showBars && (
                <Bar
                  dataKey="value"
                  fill={color}
                  fillOpacity={showLine ? 0.65 : 0.85}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                  barSize={10}
                />
              )}
              {showLine && (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: lineColor, stroke: chartTokens.bgSurface, strokeWidth: 1 }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="detail-legend">
          <button
            type="button"
            className={`detail-legend-item ${showBars ? '' : 'off'}`}
            onClick={() => {
              if (showBars && !showLine) {
                setShowBars(false);
                setShowLine(true);
              } else {
                setShowBars(v => !v);
              }
            }}
            aria-pressed={showBars}
          >
            <span className="detail-legend-dot" style={{ background: color }} />
            Histogram
          </button>
          <button
            type="button"
            className={`detail-legend-item ${showLine ? '' : 'off'}`}
            onClick={() => {
              if (showLine && !showBars) {
                setShowLine(false);
                setShowBars(true);
              } else {
                setShowLine(v => !v);
              }
            }}
            aria-pressed={showLine}
          >
            <span className="detail-legend-line-icon" style={{ borderColor: lineColor }} />
            Trend line
          </button>
        </div>
      </div>
    </div>
  );
}
