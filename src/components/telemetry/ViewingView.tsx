import { StateRegion } from '../ui/StateRegion';
import { measurementHints } from '../ui/hintContent';
import { useEffect, useMemo, useState } from 'react';
import type { PreviewObservation, TelemetryPage } from '../../types/telemetryPreview';
import { PLATFORMS } from '../../types/models';
import { durationCurve, observationTotals } from '../../utils/telemetryPreview';
import { platformMeta } from '../platformMeta';
import { AnalysisPanel, NoObservations } from './Primitives';

const curvePatterns = { youtube: '', instagram: '8 4', facebook: '2 4' };

export function ViewingView({ events, page }: { events: PreviewObservation[]; page: TelemetryPage }) {
  const [threshold, setThreshold] = useState(3);
  const [width, setWidth] = useState(980);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  useEffect(() => {
    if (!svg) return;
    const observer = new ResizeObserver(entries => { const next = entries[0]?.contentRect.width; if (next) setWidth(next); });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svg]);
  const curves = useMemo(() => (page === 'overview' ? PLATFORMS : [page]).map(platform => {
    const observations = events.filter(e => e.platform === platform);
    return { platform, observations, points: durationCurve(observations), ...observationTotals(observations) };
  }), [events, page]);
  const maxSeconds = Math.max(3, ...events.map(e => e.durationMs / 1000));
  const selected = Math.min(threshold, maxSeconds);
  const plot = { left: 50, top: 16, width: Math.max(1, width - 80), height: 220 };
  const x = (seconds: number) => plot.left + seconds / maxSeconds * plot.width;
  const y = (percent: number) => plot.top + (100 - percent) / 100 * plot.height;
  return <StateRegion id="evidence.curve" label="Duration curve" shape="chart"><AnalysisPanel title="How long each reel holds your viewing" hint={measurementHints.curve}>
    {!events.length ? <NoObservations /> : <>
      <svg ref={setSvg} className="viewing-curve" viewBox={`0 0 ${width} 275`} role="img" aria-label="Percentage of views watched at least X active seconds, by platform"
        onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); const position = event.clientX - rect.left; setThreshold(Math.round(Math.max(0, Math.min(maxSeconds, (position - plot.left) / plot.width * maxSeconds)) * 10) / 10); }}>
        {[0, 25, 50, 75, 100].map(percent => <g key={percent}><line x1={plot.left} x2={width - 30} y1={y(percent)} y2={y(percent)} stroke="var(--border-subtle)" /><text x={42} y={y(percent) + 4} textAnchor="end">{percent}%</text></g>)}
        {[0, 0.25, 0.5, 0.75, 1].map(fraction => <text key={fraction} x={x(maxSeconds * fraction)} y={260} textAnchor="middle">{(maxSeconds * fraction).toFixed(0)}s</text>)}
        {curves.map(curve => {
          // Drop immediately after each observed duration; at the threshold itself equality is retained.
          let path = `M ${x(0)} ${y(100)}`;
          for (const point of curve.points) path += ` V ${y(point.percent)} H ${x(point.seconds)}`;
          return curve.reels ? <path key={curve.platform} d={path} fill="none" stroke={platformMeta[curve.platform].color} strokeWidth={2.5} strokeDasharray={curvePatterns[curve.platform]} /> : null;
        })}
        <line x1={x(selected)} x2={x(selected)} y1={plot.top} y2={y(0)} stroke="var(--text-secondary)" strokeDasharray="4 4" />
      </svg>
      <label className="viewing-threshold">Inspect at <input type="number" min="0" max={maxSeconds} step="0.1" value={selected} onChange={e => { const value = e.target.valueAsNumber; if (Number.isFinite(value)) setThreshold(Math.max(0, Math.min(maxSeconds, value))); }} /> active seconds</label>
      <input className="viewing-slider" type="range" aria-label="Viewing duration threshold" min="0" max={maxSeconds} step="0.1" value={selected} onChange={e => setThreshold(Number(e.target.value))} />
    </>}
    <div className="viewing-platforms">{curves.map(curve => <div key={curve.platform}>
      <h3><svg className="curve-key" width="30" height="12" aria-hidden="true"><line x1="0" x2="30" y1="6" y2="6" stroke={platformMeta[curve.platform].color} strokeWidth="3" strokeDasharray={curvePatterns[curve.platform]} /></svg>{platformMeta[curve.platform].label}</h3>
      <strong>{curve.reels ? `${(curve.observations.filter(e => e.durationMs >= selected * 1000).length / curve.reels * 100).toFixed(1)}%` : '—'}</strong><span>watched ≥{selected.toFixed(1)}s</span>
      <p>{curve.reels} views · {curve.medianMs === null ? '—' : `${(curve.medianMs / 1000).toFixed(1)}s`} median · {curve.averageMs === null ? '—' : `${(curve.averageMs / 1000).toFixed(1)}s`} average</p>
    </div>)}</div>
  </AnalysisPanel></StateRegion>;
}
