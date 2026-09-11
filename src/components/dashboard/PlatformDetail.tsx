// React & 3rd-party
import { useState, useEffect, type CSSProperties } from 'react';
import { ArrowLeft, Clock, Hash, Zap, Activity } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
import type { Platform, PlatformStats } from '../../types/models';

// UI Components
import { Hint } from '../ui/Hint';
import { StateRegion } from '../ui/StateRegion';
import { useStatePreview } from '../ui/StatePreview';

// Tokens & Meta
import { chartTokens } from '../tokens';
import { platformMeta } from '../platformMeta';

// Utilities & Helpers
import { formatTime } from '../../utils/time';
import { avgFlickSec, skipDiagnostics } from '../../utils/metrics';
import { readyState, contentState, ratioState } from '../../utils/uiState';
import { measurementHints } from '../ui/hintContent';

// Styles
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

  const { overrides } = useStatePreview();
  const { pct: skipPct, of10: fill } = skipDiagnostics(d.skip, d.completedCount ?? d.count);
  const earlyMatch = d.earlyExit.match(/^(\d+)\s*\/\s*(\d+)/);
  const earlyCount = earlyMatch ? Number(earlyMatch[1]) : 0;
  const measuredCount = earlyMatch ? Number(earlyMatch[2]) : 0;
  const hasMeasured = measuredCount > 0;
  const earlyPct = hasMeasured ? Math.round((earlyCount / measuredCount) * 100) : null;
  const earlyFill = hasMeasured ? Math.min(10, Math.max(0, Math.round((earlyCount / measuredCount) * 10))) : 0;
  const flick = avgFlickSec(d.timeMs, d.count);
  const hourlyData = d.hourly.slice(0, throughHour).map((v, i) => ({
    label: String(i).padStart(2, '0'),
    value: v,
  }));

  const [showBars, setShowBars] = useState(true);
  const [showLine, setShowLine] = useState(true);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onBack();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div className="platform-detail">
      <div className="detail-topbar">
        <button
          className="detail-back"
          onClick={onBack}
          type="button"
          title="Back to Today (Esc)"
          aria-label="Back to Today"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="detail-brand-cluster">
          <span className="detail-icon" style={{ color }}>{meta.icon}</span>
          <span className="detail-title">{pName}</span>
        </div>
        <span className="detail-sub">
          {overrides.page && overrides.page.status !== 'success'
            ? ''
            : d.count
            ? `${d.share}% of total active time`
            : 'Share unavailable'}
        </span>
      </div>

      <StateRegion state={readyState} id="popup.platform-metrics" label="Platform metrics" shape="metrics">
        <div className="detail-open-hero">
          <div className="detail-open-stat">
            <span className="detail-open-val">{formatTime(d.timeMs)}</span>
            <span className="detail-open-lbl">Active Time</span>
          </div>
          <div className="detail-open-stat detail-open-stat-right">
            <span className="detail-open-val">{d.count}</span>
            <span className="detail-open-lbl">Reels Watched</span>
          </div>
        </div>
      </StateRegion>

      <StateRegion state={ratioState(d.count, 'activity')} id="popup.platform-signals" label="Platform signals" shape="metrics">
        <div className="detail-open-signals">
          <div className="detail-signal-col detail-signal-impatience" title="Quick skips: left video under 3 seconds">
            <div className="detail-signal-header">
              <Zap size={13} className="detail-signal-icon" />
              <span className="detail-signal-val">{(d.completedCount ?? d.count) ? `${skipPct}%` : '—'}</span>
              <span className="detail-signal-lbl">Impatience</span>
            </div>
            <span className="detail-signal-sub">{d.skip}/{d.completedCount ?? d.count} bailed</span>
          </div>

          <div className="detail-signal-col detail-signal-velocity" title="Velocity: consumption speed in reels per minute">
            <div className="detail-signal-header">
              <Activity size={13} className="detail-signal-icon" />
              <span className="detail-signal-val">{d.count ? d.velocity : '—'}</span>
              <span className="detail-signal-lbl">Velocity</span>
            </div>
            <span className="detail-signal-sub">reels / min</span>
          </div>

          <div className="detail-signal-col detail-signal-flick" title="Average flick: active seconds watched per reel">
            <div className="detail-signal-header">
              <Clock size={13} className="detail-signal-icon" />
              <span className="detail-signal-val">{d.count ? `${flick}s` : '—'}</span>
              <span className="detail-signal-lbl">Avg flick</span>
            </div>
            <span className="detail-signal-sub">per reel</span>
          </div>
        </div>
      </StateRegion>

<StateRegion state={ratioState(d.completedCount ?? d.count, 'completed')} id="popup.abandonment" label="Abandonment">      <div className="detail-section">
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
            <div className="abandonment-stat-cluster">
              <span className="abandonment-pill">{skipPct}%</span>
              <span className="abandonment-stat">{d.skip} / {d.completedCount ?? d.count} completed</span>
            </div>
          </div>
          <div
            className="detail-filmstrip"
            aria-hidden="true"
            style={{ '--platform-color': color } as CSSProperties}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                style={{
                  background: i < fill ? color : 'var(--border-subtle)',
                  color: i < fill ? color : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div className="abandonment-item">
          <div className="abandonment-row">
            <span className="abandonment-label">Early exit (&lt;50%)</span>
            <div className="abandonment-stat-cluster">
              <span className="abandonment-pill abandonment-pill-amber">
                {hasMeasured ? `${earlyPct}%` : '—'}
              </span>
              <span className="abandonment-stat">
                {hasMeasured ? `${earlyCount} / ${measuredCount} measured` : d.earlyExit}
              </span>
            </div>
          </div>
          <div
            className="detail-filmstrip"
            aria-hidden="true"
            style={{ '--platform-color': 'var(--accent-amber)' } as CSSProperties}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                style={{
                  background: hasMeasured && i < earlyFill ? 'var(--accent-amber)' : 'var(--border-subtle)',
                  color: hasMeasured && i < earlyFill ? 'var(--accent-amber)' : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>

</StateRegion><StateRegion state={contentState(d.count)} id="popup.platform-hourly" label="Platform hourly activity" shape="chart">      <div className="detail-section">
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
              <Tooltip content={<DetailHourTooltip />} cursor={{ fill: 'var(--chart-hover)' }} />
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
      </div></StateRegion>
    </div>
  );
}
