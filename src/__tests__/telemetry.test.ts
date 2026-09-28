// Types & Models
import type { Daypart } from '../types/telemetry';

// Utilities & Helpers
import { daypartOfHour, quantile } from '../utils/telemetry';
import { seededRandom } from '../utils/random';

declare function test(name: string, run: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toBeCloseTo(value: number, precision?: number): void };

test('local hours map to the four dayparts', () => {
  const expected: Daypart[] = ['GRAVEYARD', 'MORNING', 'AFTERNOON', 'PRIME', 'GRAVEYARD'];
  expect([2, 7, 13, 20, 23].map(daypartOfHour).join(',')).toBe(expected.join(','));
});

test('quantiles and preview randomness remain stable', () => {
  expect(quantile([1, 2, 3, 4, 5], 0.8)).toBeCloseTo(4.2, 5);
  expect(quantile([], 0.5)).toBe(null);
  expect(seededRandom(42)()).toBe(seededRandom(42)());
});
