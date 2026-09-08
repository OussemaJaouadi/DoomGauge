import { measurementHints } from '../ui/hintContent';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ObservationSession, PreviewObservation, RankedRecurringWindow, TelemetryPage, WorkspaceView } from '../../types/telemetryPreview';
import type { Evidence } from '../../utils/telemetryWorkspace';
import { DURATION_BUCKETS, sessionDistribution, evidenceEvents } from '../../utils/telemetryWorkspace';
import { clockMinute, minuteOfDay, observationTotals, trajectoryRows } from '../../utils/telemetryPreview';
import { formatTime, localDateKey } from '../../utils/time';
import { PLATFORMS } from '../../types/models';
import { platformMeta } from '../platformMeta';
import { Hint } from '../ui/Hint';
import { ChoiceGroup, NoObservations } from './Primitives';
import { TimelinePlot } from './SessionTimeline';

interface CanvasProps {
  view: WorkspaceView; events: PreviewObservation[]; previous: PreviewObservation[];
  sessions: ObservationSession[]; windows: RankedRecurringWindow[]; dates: string[]; previousDates: string[];
  completeDates: string[]; page: TelemetryPage; throughHour: number; selected?: Evidence;
  onInspect: (evidence: Evidence) => void;
}
const titles: Record<WorkspaceView, string> = { windows: 'When your time accumulates', trends: 'How your active time changes', sessions: 'Session length distribution', viewing: 'How long you watch each reel' };
const hints = { windows: measurementHints.windows, trends: measurementHints.trends, sessions: measurementHints.sessions, viewing: measurementHints.viewing };

function PlatformBar({ events, maximum, count = false }: { events: PreviewObservation[]; maximum: number; count?: boolean }) {
  return <span className="workspace-bar">{PLATFORMS.map(platform => {
    const totals = observationTotals(events.filter(event => event.platform === platform));
    const value = count ? totals.reels : totals.activeMs;
    return value > 0 ? <span key={platform} title={`${platformMeta[platform].label}: ${count ? `${value} reels` : formatTime(value)}`} style={{ width: `${maximum ? value / maximum * 100 : 0}%`, background: platformMeta[platform].color }} /> : null;
  })}</span>;
}

export function WorkspaceCanvas({ view, events, previous, sessions, windows, dates, previousDates, completeDates, page, throughHour, selected, onInspect }: CanvasProps) {
  const [measurement, setMeasurement] = useState<'count' | 'time'>('count');
  const daily = dates.length === 1;
  const sessionBuckets = sessionDistribution(sessions);
  const maxSessions = Math.max(1, ...sessionBuckets.map(bucket => bucket.sessions.length));
  const buckets = DURATION_BUCKETS.map((bucket, index) => {
    const matching = evidenceEvents(events, { kind: 'bucket', index });
    return { ...bucket, events: matching, ...observationTotals(matching) };
  });
  const bucketMax = Math.max(0, ...buckets.map(bucket => measurement === 'count' ? bucket.reels : bucket.activeMs));
  return <section className="workspace-canvas" aria-label={titles[view]}>
    <header className="workspace-chart-heading"><h2>{titles[view]}</h2><Hint label={`About ${titles[view].toLowerCase()}`} text={hints[view]} accent="blue" /></header>
    <div className="workspace-chart-meta">
      <span>{view === 'windows' ? daily ? 'Session intervals · local time' : 'Active time · completed days' : view === 'sessions' ? `${sessions.length} sessions · count by active duration` : view === 'trends' ? 'Active minutes' : 'Active viewing duration'}</span>
      {view !== 'trends' && view !== 'sessions' && <div className="workspace-legend">{(page === 'overview' ? PLATFORMS : [page]).map(platform => <span key={platform}><i style={{ background: platformMeta[platform].color }} />{platformMeta[platform].label}</span>)}</div>}
    </div>
    {view === 'windows' && (daily ? <>
      <TimelinePlot sessions={sessions} dates={dates} selectedId={selected?.kind === 'session' ? selected.id : null} onSelect={id => onInspect({ kind: 'session', id })} />
      <div className="workspace-session-index">{sessions.map(session => <button type="button" key={session.id} onClick={() => onInspect({ kind: 'session', id: session.id })} aria-pressed={selected?.kind === 'session' && selected.id === session.id}>{clockMinute(minuteOfDay(session.startTs))}<strong>{formatTime(observationTotals(session.events).activeMs)}</strong></button>)}</div>
    </> : windows.length ? <div className="workspace-ranked-list">{windows.map(window => {
      const matching = evidenceEvents(events, { kind: 'window', window });
      return <button type="button" className="workspace-rank-row" key={window.startMinute} aria-pressed={selected?.kind === 'window' && selected.window.startMinute === window.startMinute} onClick={() => onInspect({ kind: 'window', window })}>
        <span className="workspace-row-label"><b>{clockMinute(window.startMinute)}–{clockMinute(window.endMinute)}</b><small>{window.matchingDates.length}/{window.eligibleDays} days</small></span>
        <PlatformBar events={matching} maximum={windows[0]!.totalActiveMs} />
        <span className="workspace-row-value"><strong>{formatTime(window.totalActiveMs)}</strong><small>{window.sharePct?.toFixed(1)}% · {formatTime(window.medianActiveMs)} typical</small></span>
      </button>;
    })}</div> : <NoObservations>{completeDates.length < 3 ? 'At least 3 completed observed days are needed for recurring windows.' : 'No recurring windows qualify in this selection.'}</NoObservations>)}
    {view === 'sessions' && (sessions.length ? <div className="session-distribution" aria-label="Session counts by active-duration bucket">{sessionBuckets.map((bucket, index) => <button type="button" key={bucket.label} className="session-bin" aria-label={`${bucket.label}: ${bucket.sessions.length} sessions`} aria-pressed={selected?.kind === 'sessionBucket' && selected.index === index} onClick={() => onInspect({ kind: 'sessionBucket', index })}>
      <span className="session-bin-plot"><span className="session-bin-bar" style={{ height: `${bucket.sessions.length / maxSessions * 100}%` }} /><strong style={{ bottom: `${bucket.sessions.length / maxSessions * 100}%` }}>{bucket.sessions.length}</strong></span><span>{bucket.label}</span>
    </button>)}</div> : <NoObservations />)}
    {view === 'trends' && <TrendPlot events={events} previous={previous} dates={dates} previousDates={previousDates} throughHour={throughHour} page={page} selected={selected} onInspect={onInspect} />}
    {view === 'viewing' && <>
      <div className="workspace-measurement"><ChoiceGroup label="Distribution measurement" value={measurement} onChange={setMeasurement} choices={[{ value: 'count', label: 'Reels' }, { value: 'time', label: 'Active time' }]} /><button type="button" className="workspace-text-button" onClick={() => onInspect({ kind: 'curve' })}>Inspect duration curve</button></div>
      {events.length ? <div className="workspace-ranked-list">{buckets.map((bucket, index) => <button type="button" className="workspace-rank-row" key={bucket.label} aria-pressed={selected?.kind === 'bucket' && selected.index === index} onClick={() => onInspect({ kind: 'bucket', index })}>
        <span className="workspace-row-label"><b>{bucket.label}</b></span><PlatformBar events={bucket.events} maximum={bucketMax} count={measurement === 'count'} /><span className="workspace-row-value"><strong>{measurement === 'count' ? `${bucket.reels} reels` : formatTime(bucket.activeMs)}</strong></span>
      </button>)}</div> : <NoObservations />}
    </>}
  </section>;
}

function TrendPlot({ events, previous, dates, previousDates, throughHour, page, selected, onInspect }: Pick<CanvasProps, 'events' | 'previous' | 'dates' | 'previousDates' | 'throughHour' | 'page' | 'selected' | 'onInspect'>) {
  const daily = dates.length === 1;
  const rows = trajectoryRows(events, previous, dates, previousDates, daily, 'time', throughHour).map(row => ({ ...row, current: row.youtube + row.instagram + row.facebook }));
  const inspect = (index: number) => { if (rows[index]) onInspect({ kind: 'day', date: daily ? dates[0]! : dates[index]!, ...(daily ? { hour: index } : {}) }); };
  if (!events.length && !previous.length) return <NoObservations />;
  const color = `var(--chart-${page})`;
  return <>
    <div className="workspace-trend-key"><span style={{ borderBottom: `3px solid ${color}` }}>Selected period</span><span style={{ borderBottom: '2px dashed var(--chart-previous)' }}>Previous period</span></div>
    <ResponsiveContainer width="100%" height={340}><LineChart data={rows} margin={{ top: 16, right: 18, left: 0, bottom: 8 }} onClick={state => { if (state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) inspect(Number(state.activeTooltipIndex)); }}>
      <CartesianGrid stroke="var(--border-grid)" vertical={false} /><XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} minTickGap={24} tickLine={false} axisLine={false} /><YAxis width={46} tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} tickLine={false} axisLine={false} />
      <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="analysis-tooltip"><b>{label}</b>{payload.map(item => <span key={String(item.dataKey)}><i className="series-marker" style={{ background: item.color }} />{item.name}: {formatTime(Number(item.value) * 60000)}</span>)}</div> : null} />
      <Line type="linear" name="Selected" dataKey="current" stroke={color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive={false} /><Line type="linear" name="Previous" dataKey="previous" stroke="var(--chart-previous)" strokeDasharray="6 5" strokeWidth={2} dot={false} isAnimationActive={false} />
    </LineChart></ResponsiveContainer>
    <div className="workspace-point-index" aria-label="Inspect trend observations">{rows.map((row, index) => <button type="button" key={row.label} onClick={() => inspect(index)} aria-pressed={selected?.kind === 'day' && (daily ? selected.hour === index : selected.date === dates[index])}>{row.label}<strong>{formatTime(row.current * 60000)}</strong></button>)}</div>
  </>;
}
