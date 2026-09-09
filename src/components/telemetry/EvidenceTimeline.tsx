import { StateRegion } from '../ui/StateRegion';
import { measurementHints } from '../ui/hintContent';
import type { ObservationSession, PreviewObservation, RecurringWindow } from '../../types/telemetryPreview';
import type { SessionReturn } from '../../utils/telemetryInsights';
import { evidenceTimeline } from '../../utils/telemetryWorkspace';
import { clockMinute, sessionClockRange } from '../../utils/telemetryPreview';
import { formatTime } from '../../utils/time';
import { platformMeta } from '../platformMeta';
import { Hint } from '../ui/Hint';

function SessionMark({ session, start, end, selected, selectedIds, onSelect }: { session: ObservationSession; start: number; end: number; selected: boolean; selectedIds: Set<string>; onSelect: () => void }) {
  const left = Math.max(start, session.startTs), right = Math.min(end, session.endTs);
  const clock = sessionClockRange(session.startTs, session.endTs);
  const description = `${clock.dateLabel} ${clock.clockLabel}${session.startTs < start || session.endTs > end ? ' · clipped to visible interval' : ''}`;
  return <button type="button" className={`evidence-session-mark${session.startTs < start ? ' clipped-start' : ''}${session.endTs > end ? ' clipped-end' : ''}`} aria-label={description} title={description} aria-pressed={selected} onClick={onSelect}
    style={{ left: `${(left - start) / (end - start) * 100}%`, width: `${Math.max(0, right - left) / (end - start) * 100}%` }}>
    {session.events.filter(event => event.endedTs > left && event.ts < right).map(event => <span key={event.id} style={{ left: `${(Math.max(left, event.ts) - left) / Math.max(1, right - left) * 100}%`, width: `${(Math.min(right, event.endedTs) - Math.max(left, event.ts)) / Math.max(1, right - left) * 100}%`, background: platformMeta[event.platform].color, opacity: selectedIds.has(event.id) ? 1 : .25 }} />)}
  </button>;
}

export function EvidenceTimeline({ sessions, events, window, selectedId, onSelect, date }: { sessions: ObservationSession[]; events: PreviewObservation[]; window?: RecurringWindow; selectedId: string | null; onSelect: (id: string) => void; date?: string }) {
  const rows = evidenceTimeline(sessions, events, window).filter(row => !date || row.date === date);
  const selectedIds = new Set(events.map(event => event.id));
  const low = window?.startMinute ?? 0, high = window?.endMinute ?? 1440;
  return <StateRegion id="evidence.intervals" label="Session intervals" shape="chart"><section className="evidence-visual">
    <div className="evidence-visual-heading"><h3>{date ? 'Sessions' : 'Sessions by date'}</h3><Hint label="About session intervals" text={measurementHints.intervals} accent="blue" /></div>
    <div className="evidence-date-axis"><span>Date</span><div>{[0, .25, .5, .75, 1].map(fraction => <span key={fraction}>{clockMinute(low + (high - low) * fraction)}</span>)}</div><span>Active</span></div>
    {rows.map(row => <div className="evidence-date-row" key={row.date}><time dateTime={row.date} title={row.date}>{new Date(`${row.date}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</time><div className="evidence-date-track">{row.spans.map(span => <SessionMark key={span.session.id} session={span.session} start={row.startTs} end={row.endTs} selected={span.session.id === selectedId} selectedIds={selectedIds} onSelect={() => onSelect(span.session.id)} />)}</div><strong>{formatTime(row.activeMs)}</strong></div>)}
  </section></StateRegion>;
}

export function ReturnTimeline({ matches, selectedId, onSelect }: { matches: SessionReturn[]; selectedId: string | null; onSelect: (id: string, unfiltered: boolean) => void }) {
  const maximum = Math.max(1, ...matches.map(match => match.next.endTs - match.origin.startTs));
  return <StateRegion id="evidence.pairs" label="Return pairs" shape="chart" reasons={["followup", "activity", "unobserved"]}><section className="evidence-visual"><div className="evidence-visual-heading"><h3>Origin and return</h3><Hint label="About return pairs" text={measurementHints.pairs} accent="blue" /></div>
    <div className="evidence-date-axis"><span>Origin</span><div>{[0, .5, 1].map(fraction => <span key={fraction}>{formatTime(maximum * fraction)}</span>)}</div><span>Gap</span></div>
    {matches.map(match => {
      const clock = sessionClockRange(match.origin.startTs, match.origin.endTs);
      const ids = new Set([...match.origin.events, ...match.next.events].map(event => event.id));
      return <div className="evidence-date-row" key={match.origin.id}><span title={clock.dateLabel}>{clock.startDate.slice(5)}<small>{clock.startTime}</small></span><div className="evidence-date-track">
        <SessionMark session={match.origin} start={match.origin.startTs} end={match.origin.startTs + maximum} selected={selectedId === match.origin.id} selectedIds={ids} onSelect={() => onSelect(match.origin.id, false)} />
        <span className="evidence-gap" style={{ left: `${(match.origin.endTs - match.origin.startTs) / maximum * 100}%`, width: `${match.gapMs / maximum * 100}%` }} />
        <SessionMark session={match.next} start={match.origin.startTs} end={match.origin.startTs + maximum} selected={selectedId === match.next.id} selectedIds={ids} onSelect={() => onSelect(match.next.id, true)} />
      </div><strong>{formatTime(match.gapMs)}</strong></div>;
    })}
  </section></StateRegion>;
}
