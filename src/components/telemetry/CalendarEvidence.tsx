// React & 3rd-party
import { useMemo, useReducer, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

// Types & Models
import type {
  ObservationCoverage,
  ObservationSession,
  PreviewObservation,
  RecurringWindow,
} from '../../types/telemetryPreview';

// UI Components
import { EvidenceTimeline } from './EvidenceTimeline';
import { Hint } from '../ui/Hint';
import { ReelRecords } from './ReelRecords';
import { StateRegion } from '../ui/StateRegion';

// Utilities & Helpers
import { calendarEvidence, calendarSelection, initialCalendarSelection } from '../../utils/evidenceCalendar';
import { formatTime } from '../../utils/time';
import { hintFacts } from '../ui/hintContent';
import { readyState, contentState, ratioState } from '../../utils/uiState';
import { sessionClockRange } from '../../utils/telemetryPreview';

// Styles
import './CalendarEvidence.css';

interface Props {
  dates: string[]; events: PreviewObservation[]; sessions: ObservationSession[]; coverage: ObservationCoverage[]; window?: RecurringWindow;
  renderSession: (session: ObservationSession, events: PreviewObservation[], onRecords: () => void) => ReactNode;
}
const calendarHint = hintFacts([['Bars', 'Selected active time; shared scale'], ['Dates', 'Local view-start dates'], ['Partial', 'Incomplete observation coverage']], '— means unobserved. Muted timeline spans are outside the selected date or evidence.');
function compactTime(ms: number) { return ms >= 3600000 ? `${(ms / 3600000).toFixed(1)}h` : ms >= 60000 ? `${Math.floor(ms / 60000)}m` : `${Math.floor(ms / 1000)}s`; }

export function CalendarEvidence({ dates, events, sessions, coverage, window, renderSession }: Props) {
  const days = useMemo(() => calendarEvidence(dates, events, sessions, coverage, window), [dates, events, sessions, coverage, window]);
  const [selection, dispatch] = useReducer(calendarSelection, days, initialCalendarSelection);
  const day = days.find(item => item.date === selection.date);
  const session = day?.sessions.find(item => item.id === selection.id);
  const maximum = Math.max(1, ...days.map(item => item.activeMs));
  const week = days.length <= 7;
  const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const rangeLabel = days.length ? dateFormatter.formatRange(new Date(`${days[0]!.date}T12:00:00`), new Date(`${days.at(-1)!.date}T12:00:00`)) : '';
  const offset = days[0] ? (new Date(`${days[0].date}T12:00:00`).getDay() + 6) % 7 : 0;
  if (selection.records && session) return <><button type="button" className="workspace-text-button" onClick={() => dispatch({ type: 'back' })}><ArrowLeft size={16} /> Back to session</button><ReelRecords key={session.id} events={session.events} /></>;
  return <div className={`calendar-evidence ${week ? 'calendar-evidence-week' : 'calendar-evidence-month'}`}>
    <StateRegion state={contentState(days.length)} id="evidence.calendar" label="Evidence dates" shape={week ? "week" : "calendar"} skeletonCount={week ? days.length : Math.ceil((offset + days.length) / 7) * 7}><section className="evidence-calendar" aria-label="Evidence dates">
      <div className="evidence-visual-heading"><h3>{week ? 'Week' : 'Session calendar'}</h3><Hint label="About evidence dates" text={calendarHint} /></div>
      <p className="calendar-range">{rangeLabel}</p>
      <div className="calendar-grid-scroll" role="region" aria-label="Calendar dates" tabIndex={0}><div className="evidence-calendar-grid">
        {(week ? days.map(item => new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((label, index) => <span className="calendar-weekday" key={index}>{label}</span>)}
        {!week && Array.from({ length: offset }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} aria-hidden="true" />)}
        {days.map(item => {
          const date = new Date(`${item.date}T12:00:00`);
          const label = `${date.toLocaleDateString(undefined, { dateStyle: 'full' })}: ${item.status === 'unobserved' ? 'unobserved' : `${formatTime(item.activeMs)} active, ${item.reels} matching reels${item.status === 'partial' ? ', partial coverage' : ''}`}`;
          return <button type="button" key={item.date} aria-label={label} title={label} aria-pressed={item.date === selection.date} className={`calendar-day calendar-day-${item.status}`} onClick={() => dispatch({ type: 'date', date: item.date, id: item.defaultSessionId })}>
            <span className="calendar-date-number">{date.getDate()}{(date.getDate() === 1 || item.date === days[0]?.date) && <small>{date.toLocaleDateString(undefined, { month: 'short' })}</small>}</span>
            <b>{item.status === 'unobserved' ? '—' : week ? formatTime(item.activeMs) : compactTime(item.activeMs)}{item.status === 'partial' && <sup>*</sup>}</b>
            {week && <span className="calendar-week-reels">{item.status === 'unobserved' ? 'Unobserved' : `${item.reels} reels`}</span>}
            <i aria-hidden="true"><span style={week ? { height: `${item.activeMs / maximum * 100}%` } : { width: `${item.activeMs / maximum * 100}%` }} /></i>
          </button>;
        })}
        {!week && Array.from({ length: (7 - (offset + days.length) % 7) % 7 }, (_, index) => <span className="calendar-blank" key={`end-${index}`} aria-hidden="true" />)}
      </div></div>
      {days.some(item => item.status === 'partial') && <p className="calendar-qualification">* Partial coverage</p>}
    </section></StateRegion>
    <StateRegion state={day ? (day.status === 'unobserved' ? { status: 'unavailable', reason: 'unobserved' } : contentState(day.sessions.length)) : { status: 'unavailable', reason: 'session' }} id="evidence.day" label="Selected day" shape="rows"><section className="calendar-inspector" aria-label="Selected day">
      {day && <><div className="calendar-day-heading" role="status"><h3>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}</h3><span>{day.status === 'unobserved' ? 'Unobserved' : `${formatTime(day.activeMs)} active · ${day.reels} reels`}</span></div>
        {day.status === 'partial' && <span className="evidence-note">Partial coverage</span>}
        {day.sessions.length ? <><EvidenceTimeline sessions={day.sessions} events={day.events} date={day.date} window={window ? { ...window, matchingDates: [day.date] } : undefined} selectedId={selection.id} onSelect={id => dispatch({ type: 'session', id })} />
          <div className="calendar-session-choices" role="group" aria-label="Sessions on selected date">{day.sessions.map(item => {
            const ids = new Set(day.events.map(event => event.id));
            const count = day.events.filter(event => event.countInScope !== false && item.events.some(e=>e.id===event.id)).length;
            return <button type="button" key={item.id} aria-pressed={selection.id === item.id} onClick={() => dispatch({ type: 'session', id: item.id })}><span>{sessionClockRange(item.startTs, item.endTs).clockLabel}</span><b>{count} reels</b></button>;
          })}</div>
          {session && renderSession(session, day.events, () => dispatch({ type: 'records' }))}
        </> : <p className="analysis-empty">{day.status === 'unobserved' ? 'No observation coverage for this date.' : 'No matching reels on this date.'}</p>}
      </>}
    </section></StateRegion>
  </div>;
}
