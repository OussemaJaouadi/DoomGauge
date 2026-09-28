// Types & Models
import type { Daypart } from '../types/telemetry';

export function daypartOfHour(hour: number): Daypart {
  if (hour >= 6 && hour < 12) {
    return 'MORNING';
  }
  if (hour >= 12 && hour < 18) {
    return 'AFTERNOON';
  }
  if (hour >= 18 && hour < 23) {
    return 'PRIME';
  }
  return 'GRAVEYARD';
}

export function quantile(values: readonly number[], percentile: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((first, second) => first - second);
  const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
}
