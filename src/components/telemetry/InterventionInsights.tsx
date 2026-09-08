import { measurementHints, hintFacts } from '../ui/hintContent';
import { useState } from 'react';
import type { ObservationCoverage, ObservationSession, PreviewObservation, RecurringWindow, TelemetryPage } from '../../types/telemetryPreview';
import { sessionConcentration, sessionReturnRates, rankedRecurringWindows } from '../../utils/telemetryInsights';
import { clockMinute, minuteOfDay, observationTotals } from '../../utils/telemetryPreview';
import { formatTime, localDateKey } from '../../utils/time';
import { platformMeta } from '../platformMeta';
import { AnalysisPanel, NoObservations } from './Primitives';
import { SessionDetail, TimelinePlot } from './SessionTimeline';
import { PLATFORMS } from '../../types/models';

interface InterventionInsightsProps {
  events: PreviewObservation[]; sessions: ObservationSession[]; fullSessions: ObservationSession[];
  coverage: ObservationCoverage[]; completeDates: string[]; dates: string[]; page: TelemetryPage;
  onSession: (id: string) => void; onWindow: (window: RecurringWindow) => void;
}

export function InterventionInsights({ events, sessions, fullSessions, coverage, completeDates, dates, page, onSession, onWindow }: InterventionInsightsProps) {
  const [showAllWindows, setShowAllWindows] = useState(false);
  const concentration = sessionConcentration(sessions);
  const rates = sessionReturnRates(fullSessions, sessions, coverage, page);
  const windows = rankedRecurringWindows(events, completeDates);
  const [inspectedReturn, setInspectedReturn] = useState<number | null>(null);
  const [returnSessionId, setReturnSessionId] = useState<string | null>(null);
  const returnSession = fullSessions.find(session => session.id === returnSessionId);
  const selectedRate = rates.find(rate => rate.minutes === inspectedReturn);
  const scopeLabel = page === 'overview' ? 'any platform' : platformMeta[page].label;
  const maxMs = concentration.top[0]?.activeMs ?? 0;
  return <div className="patterns-overview">
    <AnalysisPanel title="Where your time concentrates" hint={measurementHints.concentration}>
      {concentration.topSharePct === null ? <NoObservations /> : <>
        <p className="insight-finding"><strong>{concentration.top.length} of {concentration.sessionCount} sessions</strong> account for <strong>{concentration.topSharePct.toFixed(1)}%</strong> of selected active time.</p>
        <div className="concentration-heading"><span>Selected session contributions</span><span>Cumulative share</span></div>
        <div className="concentration-rows">{concentration.top.map(item => <button type="button" className="concentration-row" key={item.session.id} onClick={() => onSession(item.session.id)}>
          <span className="concentration-label"><b>{localDateKey(new Date(item.session.startTs)).slice(5)} · {clockMinute(minuteOfDay(item.session.startTs))}</b><span>{formatTime(item.activeMs)} · {item.sharePct?.toFixed(1)}%</span></span>
          <span className="concentration-track">{PLATFORMS.map(platform => {
            const time = observationTotals(item.session.events.filter(event => event.platform === platform)).activeMs;
            return time > 0 ? <span key={platform} title={`${platformMeta[platform].label}: ${formatTime(time)}`} style={{ width: `${maxMs ? time / maxMs * 100 : 0}%`, background: platformMeta[platform].color }} /> : null;
          })}</span>
          <strong className="concentration-cumulative">{item.cumulativePct?.toFixed(1)}%</strong>
        </button>)}</div>
      </>}
    </AnalysisPanel>

      <AnalysisPanel title="How quickly you return" hint={hintFacts([['Next session', scopeLabel], ['Gap', 'Original end to next start'], ['Eligible', 'Full 5/15/30m observed follow-up']], 'Daypart filters select origins only. Thresholds overlap; denominators may differ.')}>
        <p className="insight-finding">Next session involving <strong>{scopeLabel}</strong>.</p>
        <div className="return-rates">{rates.map(rate => <button type="button" key={rate.minutes} className="return-rate" aria-pressed={inspectedReturn === rate.minutes} onClick={() => { setInspectedReturn(value => value === rate.minutes ? null : rate.minutes); setReturnSessionId(null); }}>
          <span className="return-label"><b>Within {rate.minutes}m</b><strong>{rate.percentage === null ? '—' : `${rate.percentage.toFixed(1)}%`}</strong></span>
          <span className="return-track"><span style={{ width: `${rate.percentage ?? 0}%` }} /></span>
          <span className="analysis-caption">{rate.returnedCount} returns / {rate.eligibleCount} eligible endings</span>
        </button>)}</div>
        {!rates.some(rate => rate.eligibleCount) && <NoObservations>No session endings have enough observed follow-up.</NoObservations>}
        {selectedRate && <div className="return-evidence"><h3>{selectedRate.matches.length} returns within {selectedRate.minutes}m</h3>
          {selectedRate.matches.length ? selectedRate.matches.map(match => <div key={match.origin.id}>
            <button type="button" onClick={() => onSession(match.origin.id)}>{localDateKey(new Date(match.origin.endTs)).slice(5)} · ended {clockMinute(minuteOfDay(match.origin.endTs))}</button>
            <span>{formatTime(match.gapMs)} gap</span>
            <button type="button" onClick={() => setReturnSessionId(match.next.id)}>Inspect return {clockMinute(minuteOfDay(match.next.startTs))}</button>
          </div>) : <p className="analysis-caption">{selectedRate.eligibleCount ? 'No returns within this threshold among eligible endings.' : 'No eligible endings; return rate is unavailable.'}</p>}
        </div>}
        {returnSession && <div><h3>Return session · unfiltered context</h3><SessionDetail session={returnSession} selectedEvents={returnSession.events} /></div>}
      </AnalysisPanel>
      <AnalysisPanel title={dates.length === 1 ? 'Your session intervals' : 'Recurring windows with most time'} hint={measurementHints.windows}>
        {dates.length === 1 ? <><TimelinePlot sessions={sessions} dates={dates} selectedId={null} onSelect={onSession} /><p className="analysis-caption">Choose 7 or 30 days to compare recurring windows.</p></> : <>
          <div className="window-axis">{[0, 6, 12, 18, 24].map(hour => <span key={hour}>{String(hour).padStart(2, '0')}</span>)}</div>
          {windows.length ? windows.slice(0, showAllWindows ? windows.length : 3).map(window => <button type="button" className="recurring-window" key={window.startMinute} onClick={() => onWindow(window)}>
            <span className="window-track"><span style={{ left: `${window.startMinute / 1440 * 100}%`, width: `${(window.endMinute - window.startMinute) / 1440 * 100}%` }} /></span>
            <span className="window-readout"><b>{clockMinute(window.startMinute)}–{clockMinute(window.endMinute)}</b><strong>{formatTime(window.totalActiveMs)} · {window.sharePct?.toFixed(1)}%</strong></span>
            <span className="window-readout"><span>{window.matchingDates.length}/{window.eligibleDays} days</span><span>{formatTime(window.medianActiveMs)} typical</span></span>
          </button>) : <NoObservations>{completeDates.length < 3 ? 'At least 3 completed observed days are needed.' : 'No recurring windows meet the threshold in this selection.'}</NoObservations>}
          {windows.length > 3 && <button type="button" className="windows-expand" aria-expanded={showAllWindows} onClick={() => setShowAllWindows(value => !value)}>{showAllWindows ? 'Show fewer windows' : `Show ${windows.length - 3} more windows`}</button>}
        </>}
      </AnalysisPanel>
  </div>;
}
