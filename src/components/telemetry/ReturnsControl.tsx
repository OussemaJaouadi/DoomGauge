// Types & Models
import type { ReturnRate } from '../../types/telemetryPreview';

// UI Components
import { Hint } from '../ui/Hint';

export function ReturnsControl({ rates, selected, onInspect }: {
  rates: ReturnRate[];
  selected?: number;
  onInspect: (minutes: number) => void;
}) {
  return <section className="returns-control" aria-label="Observed returns">
    <header>
      <span>Observed returns</span>
      <Hint label="About observed returns" text="Recorded next sessions within each time limit. Quiet gaps are unknown, so these are counts, not rates." accent="blue" />
    </header>
    <div className="telemetry-return-values">
      {rates.map(rate => <div key={rate.minutes}>
        <span>{rate.minutes}m</span>
        <button type="button" aria-label={`Inspect ${rate.observedCount} recorded returns within ${rate.minutes} minutes`}
          aria-pressed={selected === rate.minutes} onClick={() => onInspect(rate.minutes)}>
          <strong>{rate.observedCount}</strong>
        </button>
      </div>)}
    </div>
  </section>;
}
