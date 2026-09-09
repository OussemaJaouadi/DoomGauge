import { StateRegion } from '../ui/StateRegion';
import { hintFacts } from '../ui/hintContent';
import type { ReturnRate } from '../../utils/telemetryInsights';
import { Hint } from '../ui/Hint';

export function ReturnsControl({ rates, selected, onInspect }: { rates: ReturnRate[]; selected?: number; onInspect: (minutes: number) => void }) {
  const coverage = rates.map(rate => [`${rate.minutes}m`, `${rate.returnedCount} / ${rate.eligibleCount} eligible endings`] as const);
  return <section className="returns-control" aria-label="Return rates">
    <header><span>Returns</span><Hint label="About return rates" text={hintFacts(coverage, 'Returns / eligible endings. Full follow-up required; thresholds overlap. — means unavailable.')} accent="blue" /></header>
    <StateRegion id="telemetry.returns" label="Returns" shape="metrics" reasons={["followup", "activity", "unobserved"]}><div className="telemetry-return-values">{rates.map(rate => <button type="button" key={rate.minutes} aria-label={`Inspect returns within ${rate.minutes} minutes: ${rate.percentage === null ? 'unavailable' : `${rate.percentage.toFixed(1)}%`}`} aria-pressed={selected === rate.minutes} onClick={() => onInspect(rate.minutes)}><span>{rate.minutes}m</span><strong>{rate.percentage === null ? '—' : `${rate.percentage.toFixed(1)}%`}</strong><span className="return-tile-meter" aria-hidden="true"><span style={{ width: `${rate.percentage ?? 0}%` }} /></span></button>)}</div></StateRegion>
  </section>;
}
