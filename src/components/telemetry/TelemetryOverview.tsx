import { readyState, contentState, ratioState } from '../../utils/uiState';
import { StateRegion } from '../ui/StateRegion';
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
  comparisonAvailable?: boolean;
  totals: ReturnType<typeof observationTotals> | (() => ReturnType<typeof observationTotals>);
  previous: ReturnType<typeof observationTotals> | (() => ReturnType<typeof observationTotals>);
  rates: ReturnRate[] | (() => ReturnRate[]);
  selected?: Evidence;
  onInspect: (evidence: Evidence) => void;
}
const deltaTrend = (value: number) => value > 0 ? 'worse' as const : value < 0 ? 'better' as const : 'neutral' as const;

export function TelemetryOverview({ totals, previous, rates, selected, onInspect, comparisonAvailable = true }: OverviewProps) {
  function readTotals() {
    return typeof totals === 'function' ? totals() : totals;
  }

  function readPrevious() {
    return typeof previous === 'function' ? previous() : previous;
  }

  return <div className="telemetry-overview">
    <StateRegion state={readyState} id="telemetry.active" label="Active time" shape="metric">{() => {
      const current = readTotals();
      const delta = current.activeMs - readPrevious().activeMs;
      return <OverviewCard label="Active time" trend={comparisonAvailable ? deltaTrend(delta) : 'neutral'}
        icon={<Clock3 size={16} />} value={formatTime(current.activeMs)}
        delta={comparisonAvailable ? { value: delta, trend: deltaTrend(delta), style: 'sign', formatter: formatTime } : undefined} />;
    }}</StateRegion>
    <StateRegion state={readyState} id="telemetry.reels" label="Reel count" shape="metric">{() => {
      const current = readTotals();
      const delta = current.reels - readPrevious().reels;
      return <OverviewCard label="Reels" trend={comparisonAvailable ? deltaTrend(delta) : 'neutral'}
        icon={<Hash size={16} />} value={current.reels}
        delta={comparisonAvailable ? { value: delta, trend: deltaTrend(delta), style: 'sign' } : undefined} />;
    }}</StateRegion>
    <StateRegion state={() => ratioState(readTotals().completed, 'completed')} id="telemetry.skips" label="Quick skips" shape="metric">{() => {
      const current = readTotals();
      return <OverviewCard label="Quick skips" value={`${current.skipPct?.toFixed(1)}%`}
        sub={<span>{current.skips} / {current.completed} completed</span>}
        icon={<Hint label="About quick skips" text={measurementHints.quickSkip} accent="amber" />} />;
    }}</StateRegion>
    <StateRegion state={readyState} id="telemetry.returns" label="Returns" shape="metrics">{() =>
      <ReturnsControl rates={typeof rates === 'function' ? rates() : rates}
        selected={selected?.kind === 'returns' ? selected.minutes : undefined}
        onInspect={minutes => onInspect({ kind: 'returns', minutes })} />
    }</StateRegion>
  </div>;
}
