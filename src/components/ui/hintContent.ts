export interface HintFacts { rows: readonly { label: string; value: string }[]; note?: string }
export type HintContent = string | HintFacts;
export function hintFacts(rows: readonly (readonly [string, string])[], note?: string): HintFacts {
  return { rows: rows.map(([label, value]) => ({ label, value })), note };
}

export const measurementHints = {
  quickSkip: hintFacts([['Quick skip', '<3s active'], ['Share', 'Skipped / all completed views']]),
  skipStrip: hintFacts([['Quick skip', '<3s active'], ['Strip', 'Platform skip share, rounded to 10 cells']]),
  average: hintFacts([['Average', 'Active time / views'], ['Median', 'Middle duration after sorting']], 'Even count: average of the middle pair. Pauses excluded.'),
  abandonment: hintFacts([['Bailed', '<3s active'], ['Early exit', '<50% of known video duration']]),
  popupDistribution: hintFacts([['Each bar', '100% of today’s reels or active time'], ['Buckets', 'Active time per view']], 'Pauses excluded; not video completion.'),
  windows: hintFacts([['Day', 'Session positions on a clock axis'], ['Recurring', '≥3 completed days and ≥30% frequency'], ['Time share', 'Completed-day active time only']], 'Adjacent half-hour start bins merge; typical = median on matching days.'),
  trends: hintFacts([['Selected', 'Active intervals by hour/date'], ['Previous', 'Equal-length period, same final-day cutoff']], 'Includes saved in-progress time; gaps are unknown.'),
  sessions: hintFacts([['Bars', 'Session counts by active duration'], ['Grouping', 'Gaps ≤60s, before filters']], 'Unequal buckets show counts, not density. Gaps excluded from active time.'),
  viewing: hintFacts([['Buckets', 'Active duration per completed view'], ['Reels / time', 'View counts / accumulated active time']], 'Not video completion.'),
  curve: hintFacts([['At X seconds', 'Share watched for at least X active seconds'], ['Includes', 'Quick skips; excludes paused time']], 'Not video completion.'),
  intervals: hintFacts([['Position', 'Local clock time'], ['Span', 'Elapsed time; dashed ends are clipped'], ['Muted', 'Outside selected evidence']], 'Active totals use recorded intervals within the selection.'),
  pairs: hintFacts([['Row start', 'Origin session start'], ['Scale', 'Shared elapsed time'], ['Gap', 'Origin end to next session start']], 'Return inspection includes unfiltered context.'),
  returnCoverage: hintFacts([['Eligible', 'Full observed follow-up'], ['Next session', 'Matches platform scope'], ['Daypart filter', 'Origin sessions only']]),
  concentration: hintFacts([['Rank', 'Five largest selected time contributions'], ['Share', 'All selected active time'], ['Session', 'Original identity and boundaries']], 'Cumulative shares add selected active time, not elapsed spans.'),
  legacySessions: hintFacts([['Grouping', 'Gaps ≤60s, before filters'], ['Timeline', 'Original elapsed boundaries'], ['Scatter', 'Selected views only']], 'Gaps excluded from active time.'),
  platforms: hintFacts([['Comparison', 'Each platform’s preceding period'], ['Shares', 'Selected observations']], 'Zero baseline: absolute change only.'),
  mechanics: hintFacts([['Entry routes', 'Labeled visit entries'], ['Replays', 'Explicit counts'], ['Comments', 'Panel-open time']], 'Simulated, measured observations only; not attention or intent.'),
};
