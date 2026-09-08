import { useReducer, useRef } from 'react';
import type { ObservationCoverage, ObservationSession, PreviewObservation, TelemetryPage, WorkspaceView } from '../../types/telemetryPreview';
import { rankedRecurringWindows, sessionReturnRates } from '../../utils/telemetryInsights';
import { activeEvidence, evidenceReducer, type Evidence } from '../../utils/telemetryWorkspace';
import { observationTotals } from '../../utils/telemetryPreview';
import { TelemetryOverview } from './TelemetryOverview';
import { ChoiceGroup } from './Primitives';
import { WorkspaceCanvas } from './WorkspaceCanvas';
import { EvidenceDrawer } from './EvidenceDrawer';
import './Workspace.css';

interface WorkspaceProps {
  context: string; view: WorkspaceView; onViewChange: (view: WorkspaceView) => void; events: PreviewObservation[]; previous: PreviewObservation[];
  sessions: ObservationSession[]; fullSessions: ObservationSession[]; coverage: ObservationCoverage[];
  dates: string[]; previousDates: string[]; completeDates: string[]; throughHour: number; page: TelemetryPage;
}
export function AnalysisWorkspace(props: WorkspaceProps) {
  const { context, view, events, sessions, fullSessions, coverage, completeDates, page } = props;
  const [state, dispatch] = useReducer(evidenceReducer, { context, stack: [] });
  const opener = useRef<HTMLElement | null>(null);
  const selected = activeEvidence(state, context);
  const windows = rankedRecurringWindows(events, completeDates);
  const rates = sessionReturnRates(fullSessions, sessions, coverage, page);
  const inspect = (evidence: Evidence) => {
    if (!selected) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatch({ type: 'open', context, evidence });
  };
  const close = () => dispatch({ type: 'close' });
  return <div className="analysis-workspace">
    <TelemetryOverview totals={observationTotals(events)} previous={observationTotals(props.previous)} rates={rates} selected={selected} onInspect={inspect} />
    <div className="workspace-view-buttons"><ChoiceGroup label="Analysis view" value={view} onChange={props.onViewChange} choices={[{ value: 'windows', label: 'Time windows' }, { value: 'trends', label: 'Trends' }, { value: 'sessions', label: 'Sessions' }, { value: 'viewing', label: 'Viewing' }]} /></div>
    <div className="workspace-main">
      <WorkspaceCanvas {...props} windows={windows} selected={selected} onInspect={inspect} />
    </div>
    {selected && <EvidenceDrawer evidence={selected} events={events} sessions={sessions} fullSessions={fullSessions} rates={rates} page={page} dates={props.dates} coverage={coverage} restoreFocus={opener.current} onClose={close} />}
  </div>;
}
