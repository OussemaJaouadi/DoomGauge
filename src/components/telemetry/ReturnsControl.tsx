// Types & Models
import type { ReturnRate } from '../../types/telemetryPreview';

// UI Components
import { Hint } from '../ui/Hint';
import { StateRegion } from '../ui/StateRegion';

// Utilities & Helpers
import { ratioState } from '../../utils/uiState';

export function ReturnsControl({ rates, selected, onInspect }: {
  rates: ReturnRate[];
  selected?: number;
  onInspect: (minutes: number) => void;
}) {
  return <section className="returns-control" aria-label="Return rates">
    <header>
      <span>Returns</span>
      <Hint label="About return rates" text="Returns / eligible endings. Each threshold requires its own observed follow-up." accent="blue" />
    </header>
    <div className="telemetry-return-values">
      {rates.map(rate => <div key={rate.minutes}>
        <span>{rate.minutes}m</span>
        <StateRegion id={`telemetry.returns.${rate.minutes}`} label={`${rate.minutes}m returns`}
          state={ratioState(rate.eligibleCount, 'followup')} shape="metric" reasons={['followup']}>
          <button type="button" aria-label={`Inspect returns within ${rate.minutes} minutes: ${rate.percentage?.toFixed(1)}%`}
            aria-pressed={selected === rate.minutes} onClick={() => onInspect(rate.minutes)}>
            <strong>{rate.percentage?.toFixed(1)}%</strong>
            <span className="return-tile-meter" aria-hidden="true"><span style={{ width: `${rate.percentage}%` }} /></span>
          </button>
        </StateRegion>
      </div>)}
    </div>
  </section>;
}
