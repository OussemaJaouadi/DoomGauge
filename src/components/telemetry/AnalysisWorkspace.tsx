// React & 3rd-party
import { useReducer, useRef } from 'react';

// Types & Models
import type {
  ObservationCoverage,
  ObservationSession,
  PreviewObservation,
  TelemetryPage,
  WorkspaceView,
  Evidence,
} from '../../types/telemetryPreview';

// UI Components
import { ChoiceGroup } from './Primitives';
import { EvidenceDrawer } from './EvidenceDrawer';
import { StateRegion } from '../ui/StateRegion';
import { TelemetryOverview } from './TelemetryOverview';
import { WorkspaceCanvas } from './WorkspaceCanvas';

// Utilities & Helpers
import { readyState } from '../../utils/uiState';
import { observationTotals } from '../../utils/telemetryPreview';
import { rankedRecurringWindows, sessionReturnRates } from '../../utils/telemetryInsights';
import { activeEvidence, evidenceReducer } from '../../utils/telemetryWorkspace';

// Styles
import './Workspace.css';

interface WorkspaceProps {
  comparisonAvailable?: boolean;
  onClearFilters?: () => void;
  filterEmpty?: boolean;
  context: string; view: WorkspaceView; onViewChange: (view: WorkspaceView) => void; events: PreviewObservation[]; previous: PreviewObservation[];
  sessions: ObservationSession[]; fullSessions: ObservationSession[]; coverage: ObservationCoverage[];
  dates: string[]; previousDates: string[]; completeDates: string[]; throughHour: number; page: TelemetryPage;
}
export function AnalysisWorkspace(props: WorkspaceProps) {
  const { context, view, events, sessions, fullSessions, coverage, completeDates, page } = props;
  const [state, dispatch] = useReducer(evidenceReducer, { context, stack: [] });
  const opener = useRef<HTMLElement | null>(null);
  const selected = activeEvidence(state, context);
  const readRates = () => sessionReturnRates(fullSessions, sessions, coverage, page);
  const inspect = (evidence: Evidence) => {
    if (!selected) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatch({ type: 'open', context, evidence });
  };
  const close = () => dispatch({ type: 'close' });
  return <div className="analysis-workspace">
    <TelemetryOverview comparisonAvailable={props.comparisonAvailable} totals={() => observationTotals(events)} previous={() => observationTotals(props.previous)} rates={readRates} selected={selected} onInspect={inspect} />
    <div className="workspace-view-buttons"><ChoiceGroup label="Analysis view" value={view} onChange={props.onViewChange} choices={[{ value: 'windows', label: 'Time windows' }, { value: 'trends', label: 'Trends' }, { value: 'sessions', label: 'Sessions' }, { value: 'viewing', label: 'Viewing' }]} /></div>
    <div className="workspace-main">
      <StateRegion id="telemetry.chart" label="Analysis chart" state={readyState} shape="chart">{() =>
        <WorkspaceCanvas {...props} windows={view === 'windows' ? rankedRecurringWindows(events, completeDates) : []} selected={selected} onInspect={inspect} />
      }</StateRegion>
    </div>
    {selected && <EvidenceDrawer evidence={selected} events={events} sessions={sessions} fullSessions={fullSessions} rates={readRates} page={page} dates={props.dates} coverage={coverage} restoreFocus={opener.current} onClose={close} />}
  </div>;
}
