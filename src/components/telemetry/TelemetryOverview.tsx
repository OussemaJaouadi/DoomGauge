import { measurementHints } from '../ui/hintContent';
import { Clock3, Hash } from 'lucide-react';
import type { ReturnRate } from '../../utils/telemetryInsights';
import type { Evidence } from '../../utils/telemetryWorkspace';
import { formatTime } from '../../utils/time';
import { observationTotals } from '../../utils/telemetryPreview';
import { OverviewCard } from '../ui/OverviewCard';
import { Hint } from '../ui/Hint';
import { ReturnsControl } from './ReturnsControl';

interface OverviewProps {
  totals: ReturnType<typeof observationTotals>;
  previous: ReturnType<typeof observationTotals>;
  rates: ReturnRate[];
  selected?: Evidence;
  onInspect: (evidence: Evidence) => void;
}
const deltaTrend = (value: number) => value > 0 ? 'worse' as const : value < 0 ? 'better' as const : 'neutral' as const;

export function TelemetryOverview({ totals, previous, rates, selected, onInspect }: OverviewProps) {
  const timeDelta = totals.activeMs - previous.activeMs;
  const reelDelta = totals.reels - previous.reels;
  return <div className="telemetry-overview">
    <OverviewCard label="Active time" trend={deltaTrend(timeDelta)} icon={<Clock3 size={16} />} value={formatTime(totals.activeMs)} delta={{ value: timeDelta, trend: deltaTrend(timeDelta), style: 'sign', formatter: formatTime }} />
    <OverviewCard label="Reels" trend={deltaTrend(reelDelta)} icon={<Hash size={16} />} value={totals.reels} delta={{ value: reelDelta, trend: deltaTrend(reelDelta), style: 'sign' }} />
    <OverviewCard label="Quick skips" value={totals.skipPct === null ? '—' : `${totals.skipPct.toFixed(1)}%`} sub={<span>{totals.skips} / {totals.reels} views</span>} icon={<Hint label="About quick skips" text={measurementHints.quickSkip} accent="amber" />} />
    <ReturnsControl rates={rates} selected={selected?.kind === 'returns' ? selected.minutes : undefined} onInspect={minutes => onInspect({ kind: 'returns', minutes })} />
  </div>;
}
