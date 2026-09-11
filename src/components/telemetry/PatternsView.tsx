// React & 3rd-party
import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Types & Models
import { PLATFORMS, type Platform } from '../../types/models';
import type {
  ObservationCoverage,
  ObservationSession,
  PreviewObservation,
  RecurringWindow,
  TelemetryMetric,
  TelemetryPage,
} from '../../types/telemetryPreview';

// UI Components
import { AnalysisPanel, ChoiceGroup, NoObservations } from './Primitives';
import { InterventionInsights } from './InterventionInsights';

// Tokens & Meta
import { chartTokens } from '../tokens';
import { platformMeta } from '../platformMeta';

// Utilities & Helpers
import { formatTime } from '../../utils/time';
import { measurementHints } from '../ui/hintContent';
import { mechanicsSummary, observationTotals, platformTotals, trajectoryRows } from '../../utils/telemetryPreview';

interface PatternsViewProps {
  events: PreviewObservation[]; previous: PreviewObservation[]; dates: string[]; previousDates: string[]; completeDates: string[]; page: TelemetryPage; sessions: ObservationSession[];
  onWindow: (window: RecurringWindow) => void; onSession: (id: string) => void; onPlatform: (platform: Platform) => void;
  throughHour: number;
  fullSessions: ObservationSession[];
  coverage: ObservationCoverage[];
}

export function PatternsView(props: PatternsViewProps) {
  return <><InterventionInsights {...props} /><details className="period-details"><summary>Period details <span>Trends, platform comparisons and observed mechanics</span></summary><div className="period-details-content"><PeriodDetails {...props} /></div></details></>;
}

function PeriodDetails({ events, previous, dates, previousDates, page, onPlatform, throughHour }: PatternsViewProps) {
  const [metric, setMetric] = useState<TelemetryMetric>('time');
  const hourly = dates.length === 1;
  const rows = trajectoryRows(events, previous, dates, previousDates, hourly, metric, throughHour);
  const totals = observationTotals(events);
  const channels = page === 'overview' ? PLATFORMS : [page];
  return <>
    <AnalysisPanel title={hourly ? 'Your day, hour by hour' : 'How your scrolling is changing'}
      hint={measurementHints.trends}
      controls={<ChoiceGroup label="Trajectory measurement" value={metric} onChange={setMetric} choices={[{ value: 'time', label: 'Active time' }, { value: 'reels', label: 'Reels' }]} />}>
      <div className="analysis-chart-legend">{channels.map(p => <span key={p}><span style={{ color: platformMeta[p].color }}>{platformMeta[p].icon}</span>{platformMeta[p].label}</span>)}<span className="previous-key">Previous period</span><span>{metric === 'time' ? 'minutes' : 'reels'}</span></div>
      {!events.length && !previous.length ? <NoObservations /> : <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }} accessibilityLayer>
          <CartesianGrid stroke={chartTokens.borderSubtle} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: chartTokens.textSecondary, fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={{ fill: chartTokens.textSecondary, fontSize: 12 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="analysis-tooltip"><strong>{label}</strong>{payload.map(item => <span key={String(item.dataKey)}><i className="series-marker" style={{ background: item.color }} />{item.name}: {metric === 'time' ? formatTime(Number(item.value) * 60000) : String(item.value)}</span>)}</div> : null} />
          {channels.map(p => <Bar key={p} dataKey={p} name={platformMeta[p].label} stackId="views" fill={platformMeta[p].color} maxBarSize={32} isAnimationActive={false} />)}
          <Line type="linear" dataKey="previous" name="Previous period" stroke="var(--chart-previous)" strokeDasharray="5 5" dot={false} strokeWidth={2} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>}
    </AnalysisPanel>
      {page === 'overview' ? <AnalysisPanel title="Where the time goes" hint={measurementHints.platforms}>
        {platformTotals(events).map(platform => {
          const old = observationTotals(previous.filter(e => e.platform === platform.platform));
          const delta = platform.activeMs - old.activeMs;
          return <button type="button" key={platform.platform} className="platform-comparison" onClick={() => onPlatform(platform.platform)}>
            <span className="platform-comparison-head"><b><span style={{ color: platformMeta[platform.platform].color }}>{platformMeta[platform.platform].icon}</span>{platformMeta[platform.platform].label}</b><strong>{formatTime(platform.activeMs)}</strong></span>
            <span className="comparison-track"><span style={{ background: platformMeta[platform.platform].color, width: `${totals.activeMs ? platform.activeMs / totals.activeMs * 100 : 0}%` }} /></span>
            <span className="comparison-values"><span>{totals.activeMs ? `${Math.round(platform.activeMs / totals.activeMs * 100)}% time` : '— time'} · {totals.reels ? `${Math.round(platform.reels / totals.reels * 100)}% reels` : '— reels'}</span><span className={delta > 0 ? 'delta-worse' : delta < 0 ? 'delta-better' : ''}>{delta > 0 ? '+' : delta < 0 ? '−' : ''}{formatTime(Math.abs(delta))}</span></span>
          </button>;
        })}
      </AnalysisPanel> : <MechanicsPanel events={events} />}
  </>;
}

function MechanicsPanel({ events }: { events: PreviewObservation[] }) {
  const mechanics = mechanicsSummary(events);
  return <AnalysisPanel title="How these visits unfolded" hint={measurementHints.mechanics}>
    <span className="mechanics-simulated">Simulated mechanics</span>
    <div className="entry-routes">{mechanics.entries.map(entry => <div className="entry-route" key={entry.route}><span>{entry.route}</span><div className="comparison-track"><span style={{ width: `${mechanics.entryMeasured ? entry.count / mechanics.entryMeasured * 100 : 0}%` }} /></div><b>{mechanics.entryMeasured ? entry.count : '—'}</b></div>)}</div>
    <p className="analysis-caption">{mechanics.entryMeasured} labeled entries</p>
    <div className="mechanics-readouts"><div><b>{mechanics.replayCount ?? '—'}</b><span>explicit replays</span><small>{mechanics.replayMeasured}/{events.length} views measured</small></div><div><b>{mechanics.commentMs === null ? '—' : formatTime(mechanics.commentMs)}</b><span>comment panel open</span><small>{mechanics.commentMeasured}/{events.length} views measured</small></div></div>
  </AnalysisPanel>;
}
