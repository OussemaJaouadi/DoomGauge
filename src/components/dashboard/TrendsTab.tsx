import React from 'react';
import HourlyBars from '../charts/HourlyBars';
import { SessionCard } from '../ui/SessionCard';
import { formatTime } from '../../utils/time';
import type { HourItem } from '../../types/models';
import type { TemporalInsights } from '../../utils/popupActivity';
import { HOURLY_MOCK, POPUP_INSIGHTS } from '../../data/popupMock';
import './TrendsTab.css';

interface TrendsTabProps {
  insights?: TemporalInsights;
  hourlyData?: HourItem[];
}

export function TrendsTab({
  insights = POPUP_INSIGHTS,
  hourlyData = HOURLY_MOCK,
}: TrendsTabProps) {
  const { worstVortex, daySummary } = insights;

  return (
    <div className="trends-tab">
      <SessionCard
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

      <HourlyBars data={hourlyData} />
    </div>
  );
}
