import React from 'react';
import { OverviewCard } from '../ui/OverviewCard';
import HourlyBars from '../charts/HourlyBars';
import { findActivityClusters, findValleyRanges } from '../../utils/peaks';
import { formatRange } from '../../utils/time';
import { HOURLY_MOCK } from '../../data/mock';

export function TrendsTab() {
  const clusters = findActivityClusters(HOURLY_MOCK);
  const valleyRanges = findValleyRanges(HOURLY_MOCK, 1);
  const longestValley = valleyRanges[0];
  
  // Dynamically rank clusters based on today's actual data
  const sortedClusters = [...clusters].sort((a, b) => b.total - a.total);
  
  const highInterval = sortedClusters.length > 0 ? sortedClusters[0] : undefined;
  const lowInterval = sortedClusters.length > 1 ? sortedClusters[sortedClusters.length - 1] : undefined;
  
  let moderateInterval = undefined;
  if (sortedClusters.length > 2) {
    moderateInterval = sortedClusters[Math.floor((sortedClusters.length - 1) / 2)];
  }

  return (
    <div className="trends-tab">
      <div className="hourly-grid" style={{ marginBottom: '16px' }}>
        <div className="hourly-row">
          {lowInterval && (
            <OverviewCard
              label="LOW"
              value={formatRange(lowInterval.start, lowInterval.end)}
              sub={`${lowInterval.total} reels`}
              trend="neutral"
              border="var(--accent-cyan)"
            />
          )}
          <OverviewCard
            label="ZERO"
            value={longestValley ? formatRange(longestValley.start, longestValley.end) : "No clean period today"}
            sub={longestValley ? `${longestValley.end - longestValley.start + 1}h` : undefined}
            trend="neutral"
            border="var(--text-muted)"
          />
        </div>
        <div className="hourly-row">
          {highInterval && (
            <OverviewCard
              label="HIGH"
              value={formatRange(highInterval.start, highInterval.end)}
              sub={`${highInterval.total} reels`}
              trend="negative"
              border="var(--threat-red)"
            />
          )}
          {moderateInterval && (
            <OverviewCard
              label="MODERATE"
              value={formatRange(moderateInterval.start, moderateInterval.end)}
              sub={`${moderateInterval.total} reels`}
              trend="neutral"
              border="var(--accent-amber)"
            />
          )}
        </div>
      </div>
      <HourlyBars data={HOURLY_MOCK} />
    </div>
  );
}
