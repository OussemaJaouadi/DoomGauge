// React & 3rd-party
import React from 'react';

// Types & Models
import type { HourItem } from '../../types/models';
import type { TemporalInsights } from '../../types/popup';

// UI Components
import HourlyBars from '../charts/HourlyBars';
import { SessionCard } from '../ui/SessionCard';
import { StateRegion } from '../ui/StateRegion';

// Utilities & Helpers
import { formatTime } from '../../utils/time';
import { readyState, contentState } from '../../utils/uiState';

// Data & Mocks
import { HOURLY_MOCK, POPUP_INSIGHTS } from '../../data/popupMock';

// Styles
import './TrendsTab.css';

interface TrendsTabProps {
  insights?: TemporalInsights | (() => TemporalInsights);
  hourlyData?: HourItem[];
}

export function TrendsTab({
  insights = POPUP_INSIGHTS,
  hourlyData = HOURLY_MOCK,
}: TrendsTabProps) {

  return (
    <div className="trends-tab">
      <StateRegion state={readyState} id="popup.hourly-summary" label="Session summary" shape="metrics">{() => {
        const { worstVortex, daySummary } = typeof insights === 'function' ? insights() : insights;
        return <StateRegion state={contentState(daySummary.sessionCount)} id="popup.session-data" label="Sessions" shape="metrics"><SessionCard
        label="Worst Vortex"
        timeRange={worstVortex ? `${worstVortex.startTime} – ${worstVortex.endTime}` : null}
        elapsedMs={worstVortex?.elapsedMs ?? 0}
        activeMs={worstVortex?.activeMs ?? 0}
        reelCount={worstVortex?.reelCount ?? 0}
        concentrationPct={daySummary.concentrationPct}
        activeConcentrationPct={daySummary.activeConcentrationPct}
      />

      <div className="trends-chart-meta">
        <span className="trends-sessions-count">
          {daySummary.sessionCount}{' '}
          {daySummary.sessionCount === 1 ? 'session' : 'sessions'} today
        </span>
        <span className="trends-avg-session">
          {formatTime(daySummary.avgSessionActiveMs)} avg active per session
        </span>
      </div>

      </StateRegion>;
      }}</StateRegion><StateRegion state={contentState(hourlyData.reduce((sum, hour) => sum + hour.total, 0))} id="popup.hourly-chart" label="Hourly activity" shape="chart"><HourlyBars data={hourlyData} /></StateRegion>
    </div>
  );
}
