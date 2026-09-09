import { StateRegion } from '../ui/StateRegion';
import { StatePreviewControls } from '../ui/StatePreview';
import { hintFacts, measurementHints } from '../ui/hintContent';
import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { ObservationCoverage, ObservationSession, PreviewObservation, TelemetryPage } from '../../types/telemetryPreview';
import { DURATION_BUCKETS, SESSION_BUCKETS, sessionDistribution, detailReducer, evidenceEvents, type Evidence } from '../../utils/telemetryWorkspace';
import type { ReturnRate } from '../../utils/telemetryInsights';
import { clockMinute, mechanicsSummary, observationTotals, platformTotals, scopedSessions, sessionClockRange } from '../../utils/telemetryPreview';
import { formatTime } from '../../utils/time';
import { platformMeta } from '../platformMeta';
import { Hint } from '../ui/Hint';
import { ViewingView } from './ViewingView';
import { NoObservations } from './Primitives';
import { EvidenceTimeline, ReturnTimeline } from './EvidenceTimeline';
import { ReelRecords } from './ReelRecords';
import { CalendarEvidence } from './CalendarEvidence';

interface DrawerProps {
  dates: string[]; coverage: ObservationCoverage[];
  evidence: Evidence; events: PreviewObservation[]; sessions: ObservationSession[];
  fullSessions: ObservationSession[]; rates: ReturnRate[]; page: TelemetryPage;
  onClose: () => void; restoreFocus: HTMLElement | null;
}
function titleFor(evidence: Evidence) {
  switch (evidence.kind) {
    case 'sessionBucket': return `${SESSION_BUCKETS[evidence.index]?.label ?? ''} sessions`;
    case 'window': return `${clockMinute(evidence.window.startMinute)}–${clockMinute(evidence.window.endMinute)}`;
    case 'day': return `${evidence.date}${evidence.hour === undefined ? '' : ` · ${clockMinute(evidence.hour * 60)}`}`;
    case 'bucket': return `${DURATION_BUCKETS[evidence.index]?.label ?? ''} viewing`;
    case 'returns': return `Returns within ${evidence.minutes}m`;
    case 'curve': return 'Duration curve';
    case 'session': return 'Session evidence';
  }
}

export function EvidenceDrawer({ evidence, events, sessions, fullSessions, rates, page, dates, coverage, onClose, restoreFocus }: DrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef(restoreFocus);
  useLayoutEffect(() => {
    const node = dialog.current;
    node?.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => { node?.close(); };
  }, []);
  useEffect(() => {
    const target = opener.current;
    return () => { if (target?.isConnected) target.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className="evidence-drawer evidence-modal" aria-labelledby="evidence-title" aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="evidence-header"><h2 id="evidence-title" ref={heading} tabIndex={-1}>{titleFor(evidence)}</h2><button type="button" onClick={onClose} aria-label="Close evidence"><X size={20} /></button></header>
    <StatePreviewControls scope="evidence." />
    <EvidenceContent key={JSON.stringify(evidence)} evidence={evidence} events={events} sessions={sessions} fullSessions={fullSessions} rates={rates} page={page} dates={dates} coverage={coverage} />
  </dialog>;
}

function EvidenceContent({ evidence, events, sessions, fullSessions, rates, page, dates, coverage }: Omit<DrawerProps, 'onClose' | 'restoreFocus'>) {
  const [detail, dispatch] = useReducer(detailReducer, { id: evidence.kind === 'session' ? evidence.id : null, unfiltered: evidence.kind === 'session' && !!evidence.unfiltered, records: false });
  const selectedEvents = evidence.kind === 'sessionBucket' ? (sessionDistribution(sessions)[evidence.index]?.sessions.flatMap(session => session.events) ?? []) : evidenceEvents(events, evidence);
  const matchingIds = new Set(scopedSessions(sessions, selectedEvents).map(session => session.id));
  const matchingSessions = fullSessions.filter(session => matchingIds.has(session.id));
  const selectedSession = fullSessions.find(session => session.id === detail.id);
  const rate = evidence.kind === 'returns' ? rates.find(item => item.minutes === evidence.minutes) : undefined;
  const select = (id: string, unfiltered = false) => dispatch({ type: 'select', id, unfiltered });
  if (evidence.kind === 'curve') return <div className="evidence-body"><ViewingView events={events} page={page} /></div>;
  if (dates.length > 1 && (evidence.kind === 'window' || evidence.kind === 'sessionBucket' || evidence.kind === 'bucket')) return <div className="evidence-body">
    <EvidenceSummary events={selectedEvents} />
    <CalendarEvidence dates={dates} events={selectedEvents} sessions={matchingSessions} coverage={coverage} window={evidence.kind === 'window' ? evidence.window : undefined}
      renderSession={(session, dayEvents, onRecords) => <SelectedSession session={session} selectedEvents={dayEvents} unfiltered={false} onRecords={onRecords} />} />
  </div>;
  if (detail.records && selectedSession) return <div className="evidence-body"><button type="button" className="workspace-text-button" onClick={() => dispatch({ type: 'back' })}><ArrowLeft size={16} /> Back to session</button><ReelRecords key={selectedSession.id} events={selectedSession.events} /></div>;
  return <div className="evidence-body">
    {evidence.kind === 'returns' ? <>
      <StateRegion id="evidence.return-summary" label="Return summary" shape="metrics" reasons={["followup", "activity"]}><div className="evidence-totals"><b>{rate?.returnedCount ?? 0} returns</b><span>{rate?.eligibleCount ?? 0} eligible endings</span><Hint label="About return coverage" text={measurementHints.returnCoverage} accent="blue" /></div></StateRegion>
      {rate?.matches.length ? <ReturnTimeline matches={rate.matches} selectedId={detail.id} onSelect={select} /> : <NoObservations>{rate?.eligibleCount ? 'No returns in this threshold.' : 'Not enough observed follow-up.'}</NoObservations>}
    </> : evidence.kind !== 'session' ? <>
      <EvidenceSummary events={selectedEvents} />
      {matchingSessions.length ? <EvidenceTimeline sessions={matchingSessions} events={selectedEvents} window={evidence.kind === 'window' ? evidence.window : undefined} selectedId={detail.id} onSelect={select} /> : <NoObservations />}
    </> : null}
    {selectedSession && <SelectedSession session={selectedSession} selectedEvents={detail.unfiltered ? selectedSession.events : selectedEvents} unfiltered={detail.unfiltered} onRecords={() => dispatch({ type: 'records' })} />}
    {evidence.kind === 'session' && !selectedSession && <NoObservations>Session unavailable.</NoObservations>}
  </div>;
}

function EvidenceSummary({ events }: { events: PreviewObservation[] }) {
  const totals = observationTotals(events);
  return <StateRegion id="evidence.summary" label="Evidence totals" shape="metrics"><div className="evidence-overview"><div className="evidence-totals"><b>{formatTime(totals.activeMs)}</b><span>{totals.reels} reels</span></div><div className="evidence-platforms">{platformTotals(events).filter(item => item.reels || item.activeMs).map(item => <div key={item.platform}><span><i style={{ background: platformMeta[item.platform].color }} />{platformMeta[item.platform].label}</span><b>{formatTime(item.activeMs)}</b></div>)}</div></div></StateRegion>;
}

function SelectedSession({ session, selectedEvents, unfiltered, onRecords }: { session: ObservationSession; selectedEvents: PreviewObservation[]; unfiltered: boolean; onRecords: () => void }) {
  const ids = new Set(selectedEvents.map(event => event.id));
  const matching = session.events.filter(event => ids.has(event.id));
  const totals = observationTotals(matching);
  const span = Math.max(1, session.endTs - session.startTs);
  const clock = sessionClockRange(session.startTs, session.endTs);
  const mechanics = mechanicsSummary(matching);
  return <StateRegion id="evidence.session" label="Selected session" shape="rows" reasons={["session", "activity", "unobserved"]}><section className="selected-session">
    <div className="evidence-visual-heading"><h3>{clock.dateLabel} · {clock.clockLabel}</h3><Hint label="About selected session" text={hintFacts([['Active / reels', unfiltered ? 'Full return session' : 'Selected evidence only'], ['Elapsed', 'Full original session'], ['Muted', 'Outside selection']], 'View spans include internal pauses.')} accent="blue" /></div>
    {unfiltered && <span className="evidence-note">Unfiltered return</span>}
    <div className="selected-session-metrics"><div><span>Selected active</span><b>{formatTime(totals.activeMs)}</b></div><div><span>Full elapsed</span><b>{formatTime(session.endTs - session.startTs)}</b></div><div><span>Reels</span><b>{totals.reels}</b></div><div><span>Quick skips</span><b>{totals.skips}</b></div></div>
    <div className="session-sequence" role="img" aria-label="Chronological view spans; muted spans fall outside the selected evidence">{session.events.map(event => <span key={event.id} title={`${platformMeta[event.platform].label}: ${formatTime(event.durationMs)} active`} style={{ left: `${(event.ts - session.startTs) / span * 100}%`, width: `${(event.endedTs - event.ts) / span * 100}%`, background: platformMeta[event.platform].color, opacity: ids.has(event.id) ? 1 : .25 }} />)}</div>
    <StateRegion id="evidence.mechanics" label="Measured mechanics" reasons={["unobserved"]}><div className="selected-mechanics">
      {mechanics.entryMeasured > 0 && <span>Entry routes <b>{mechanics.entries.filter(item => item.count).map(item => `${item.route} ${item.count}`).join(' · ')}</b></span>}
      {mechanics.replayCount !== null && <span>Replays <b>{mechanics.replayCount}</b></span>}
      {mechanics.commentMs !== null && <span>Comments open <b>{formatTime(mechanics.commentMs)}</b></span>}
      <Hint label="About measured mechanics" text={hintFacts([['Entry routes', `${mechanics.entryMeasured}/${matching.length} measured`], ['Replays', `${mechanics.replayMeasured}/${matching.length} measured`], ['Comments', `${mechanics.commentMeasured}/${matching.length} measured`]], 'Simulated coverage. Unmeasured values are omitted, not zero.')} accent="blue" />
    </div>
    </StateRegion><button type="button" className="workspace-text-button" onClick={onRecords}>View reel records</button>
  </section></StateRegion>;
}
