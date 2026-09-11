// React & 3rd-party
import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types & Models
import type { ObservationSession, PreviewObservation } from '../../types/telemetryPreview';

// UI Components
import { AnalysisPanel, ChoiceGroup, NoObservations } from './Primitives';

// Tokens & Meta
import { chartTokens } from '../tokens';
import { platformMeta } from '../platformMeta';

// Utilities & Helpers
import { formatTime, localDateKey } from '../../utils/time';
import { measurementHints } from '../ui/hintContent';
import { observationTotals, clockMinute, minuteOfDay, shiftDate } from '../../utils/telemetryPreview';

export function sessionDescription(session: ObservationSession) {
  const totals = observationTotals(session.events);
  return `${localDateKey(new Date(session.startTs))} ${clockMinute(minuteOfDay(session.startTs))}–${clockMinute(minuteOfDay(session.endTs))}: ${formatTime(totals.activeMs)} selected active, ${formatTime(session.endTs - session.startTs)} full span, ${totals.reels} reels, ${totals.skips} quick skips`;
}

export function TimelinePlot({ sessions, dates, selectedId, onSelect }: { sessions: ObservationSession[]; dates: string[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (!sessions.length) return <NoObservations />;
  return <div className="session-timeline">
    <div className="timeline-axis"><span>Date</span><div>{[0, 6, 12, 18, 24].map(h => <span key={h}>{String(h).padStart(2, '0')}:00</span>)}</div></div>
    <div className="timeline-days">
      {dates.map(date => {
        const day = new Date(`${date}T00:00:00`);
        const start = day.getTime();
        const end = shiftDate(day, 1).getTime();
        const matches = sessions.filter(s => s.endTs > start && s.startTs < end);
        return <div className="timeline-day" key={date}><span>{date.slice(5)}</span><div className="timeline-track">
          {matches.map(session => {
            const left = Math.max(start, session.startTs);
            const right = Math.min(end, session.endTs);
            return <button type="button" key={session.id} className={`timeline-session ${selectedId === session.id ? 'selected' : ''}`}
              style={{ left: `${(left - start) / (end - start) * 100}%`, width: `${(right - left) / (end - start) * 100}%` }}
              aria-label={sessionDescription(session)} title={sessionDescription(session)} aria-pressed={selectedId === session.id} onClick={() => onSelect(session.id)}>
              {session.events.filter(e => e.endedTs > left && e.ts < right).map(e => <span key={e.id} style={{
                left: `${(Math.max(left, e.ts) - left) / (right - left) * 100}%`, width: `${(Math.min(right, e.endedTs) - Math.max(left, e.ts)) / (right - left) * 100}%`, background: platformMeta[e.platform].color,
              }} />)}
            </button>;
          })}
        </div></div>;
      })}
    </div>
  </div>;
}

export function SessionDetail({ session, selectedEvents }: { session: ObservationSession; selectedEvents: readonly PreviewObservation[] }) {
  const totals = observationTotals(session.events);
  const selectedIds = new Set(selectedEvents.map(e => e.id));
  const span = session.endTs - session.startTs;
  return <div className="session-inspector">
    <div className="analysis-panel-head"><h3>{clockMinute(minuteOfDay(session.startTs))}–{clockMinute(minuteOfDay(session.endTs))} <span>{localDateKey(new Date(session.startTs))}</span></h3><span className="analysis-muted">Full session context</span></div>
    <div className="session-facts"><span><b>{formatTime(totals.activeMs)}</b> active</span><span><b>{formatTime(span)}</b> span</span><span><b>{totals.reels}</b> reels</span><span><b>{totals.skips}</b> quick skips</span><span><b>{formatTime(Math.max(0, span - totals.activeMs))}</b> pauses / gaps</span></div>
    <div className="session-sequence" role="img" aria-label="Views in chronological order; dark gaps separate observations. Muted views are outside your filter.">
      {session.events.map(e => <span key={e.id} title={`${platformMeta[e.platform].label}: ${formatTime(e.durationMs)} active, ${formatTime(e.endedTs - e.ts)} span`}
        style={{ left: `${(e.ts - session.startTs) / Math.max(1, span) * 100}%`, width: `${(e.endedTs - e.ts) / Math.max(1, span) * 100}%`, background: platformMeta[e.platform].color, opacity: selectedIds.has(e.id) ? 1 : 0.25 }} />)}
    </div>
    <p className="analysis-caption">Colored spans include pauses within a view. Dark gaps are between views; muted spans are outside your selection.</p>
    <details><summary>Inspect {session.events.length} views</summary><div className="analysis-table-scroll"><table><thead><tr><th>Start</th><th>Platform</th><th>Active</th><th>Span</th></tr></thead><tbody>{session.events.map(e => <tr key={e.id}><td>{clockMinute(minuteOfDay(e.ts))}</td><td style={{ color: platformMeta[e.platform].color }}>{platformMeta[e.platform].label}</td><td>{formatTime(e.durationMs)}</td><td>{formatTime(e.endedTs - e.ts)}</td></tr>)}</tbody></table></div></details>
  </div>;
}

export function SessionsView({ sessions, fullSessions, dates, selectedId, onSelect, events }: { sessions: ObservationSession[]; fullSessions: ObservationSession[]; dates: string[]; selectedId: string | null; onSelect: (id: string) => void; events: PreviewObservation[] }) {
  const [mode, setMode] = useState<'timeline' | 'scatter'>('timeline');
  const selected = fullSessions.find(s => s.id === selectedId && sessions.some(visible => visible.id === s.id));
  const points = sessions.map(session => {
    const totals = observationTotals(session.events);
    return { id: session.id, minutes: totals.activeMs / 60000, skipPct: totals.skipPct ?? 0, reels: totals.reels, label: sessionDescription(session) };
  });
  return <AnalysisPanel title="Your sessions" hint={measurementHints.legacySessions}
    controls={<ChoiceGroup label="Session chart" value={mode} onChange={setMode} choices={[{ value: 'timeline', label: 'Timeline' }, { value: 'scatter', label: 'Scatter' }]} />}>
    <p className="analysis-caption">{sessions.length} sessions · select one to inspect its sequence</p>
    {mode === 'timeline' ? <TimelinePlot sessions={sessions} dates={dates} selectedId={selectedId} onSelect={onSelect} /> : !points.length ? <NoObservations /> : <>
      <ResponsiveContainer width="100%" height={300}><ScatterChart margin={{ top: 12, bottom: 24, left: 12, right: 16 }}>
        <CartesianGrid stroke={chartTokens.borderSubtle} vertical={false} />
        <XAxis type="number" dataKey="minutes" name="Active minutes" tick={{ fill: chartTokens.textSecondary, fontSize: 12 }} label={{ value: 'Active minutes', position: 'bottom', fill: chartTokens.textSecondary }} />
        <YAxis type="number" dataKey="skipPct" name="Quick skips" domain={[0, 100]} unit="%" tick={{ fill: chartTokens.textSecondary, fontSize: 12 }} />
        <ZAxis dataKey="reels" range={[40, 400]} name="Reels" />
        <Tooltip content={({ payload }) => payload?.[0] ? <div className="analysis-tooltip">{String(payload[0].payload.label)}</div> : null} />
        <Scatter data={points} fill={chartTokens.allPlatforms} isAnimationActive={false} onClick={point => { const id: unknown = point.payload?.id; if (typeof id === 'string') { onSelect(id); setMode('timeline'); } }} />
      </ScatterChart></ResponsiveContainer>
      <details><summary>Select a session by date</summary><div className="session-picker">{points.map(p => <button type="button" key={p.id} onClick={() => { onSelect(p.id); setMode('timeline'); }}>{p.label}</button>)}</div></details>
    </>}
    {selected && <SessionDetail session={selected} selectedEvents={events} />}
  </AnalysisPanel>;
}
