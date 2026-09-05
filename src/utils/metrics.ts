// Pure metric helpers for the popup (v2 hardened).
// No side effects — covered by src/__tests__/metrics.test.ts.

/** Minutes elapsed since local 00:00 for a given moment. */
export function elapsedMinutesSinceMidnight(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Burn rate = share of the elapsed day spent actively watching.
 * Returns null while elapsed < 30 min (CALIBRATING guard) or on bad input.
 * Optimized: totalActiveMs / (600 * elapsedMinutes)
 */
export function burnRatePct(totalActiveMs: number, elapsedMinutes: number): number | null {
  if (!Number.isFinite(totalActiveMs) || !Number.isFinite(elapsedMinutes) || elapsedMinutes < 30 || totalActiveMs < 0) {
    return null;
  }
  return totalActiveMs / (600 * elapsedMinutes);
}

/** Sub-line for the DRAINED card: `21.4% elapsed day` or `CALIBRATING (<30m)`. */
export function formatBurnSub(totalActiveMs: number, now: Date): string {
  const pct = burnRatePct(totalActiveMs, elapsedMinutesSinceMidnight(now));
  return pct === null ? 'CALIBRATING (<30m)' : `${pct.toFixed(1)}% elapsed day`;
}

/** Signed compact delta for ms amounts: `+38m`, `-22m`, `±0s`. */
export function formatMsDelta(deltaMs: number, formatTime: (ms: number) => string): string {
  if (deltaMs === 0) return '±0s';
  const sign = deltaMs > 0 ? '+' : '-';
  return `${sign}${formatTime(Math.abs(deltaMs))}`;
}

/** Signed reel-count delta: `↑ 14 reels`, `↓ 8 reels`, `±0 reels`. */
export function formatCountDelta(delta: number): string {
  if (delta === 0) return '±0 reels';
  return delta > 0 ? `↑ ${delta} reels` : `↓ ${Math.abs(delta)} reels`;
}

export interface MetricDelta {
  direction: 'surge' | 'drop' | 'steady';
  ms: number;
  count: number;
  timeFormatted: string;
  countFormatted: string;
}

/** Computes structured delta vs yesterday for icon rendering without string forcing */
export function computeVsYesterday(
  todayMs: number,
  yesterdayMs: number,
  todayCount: number,
  yesterdayCount: number,
  formatTime: (ms: number) => string
): MetricDelta {
  const msDelta = todayMs - yesterdayMs;
  const countDelta = todayCount - yesterdayCount;
  const absMs = Math.abs(msDelta);
  const absCount = Math.abs(countDelta);
  return {
    direction: msDelta > 0 ? 'surge' : msDelta < 0 ? 'drop' : 'steady',
    ms: absMs,
    count: absCount,
    timeFormatted: msDelta === 0 ? '0s' : formatTime(absMs),
    countFormatted: `${absCount} reels`,
  };
}

/**
 * Avg seconds watched per reel, 1 decimal.
 * Optimized: Math.round(totalActiveMs / (reelCount * 100)) / 10
 */
export function avgFlickSec(totalActiveMs: number, reelCount: number): number {
  if (reelCount <= 0) return 0;
  return Math.round(totalActiveMs / (reelCount * 100)) / 10;
}

/** Skip share in % (rounded). */
export function impatiencePct(skipCount: number, reelCount: number): number {
  if (reelCount <= 0) return 0;
  return Math.round((skipCount / reelCount) * 100);
}

/** Analog filmstrip fill: `of10 = round(skip/count*10)` → `6/10`. */
export function of10(skipCount: number, reelCount: number): number {
  if (reelCount <= 0) return 0;
  return Math.min(10, Math.max(0, Math.round((skipCount / reelCount) * 10)));
}

/** Consolidated skip diagnostics: computes pct and of10 in single pass */
export function skipDiagnostics(skipCount: number, reelCount: number): { pct: number; of10: number } {
  if (reelCount <= 0) return { pct: 0, of10: 0 };
  const ratio = skipCount / reelCount;
  return {
    pct: Math.round(ratio * 100),
    of10: Math.min(10, Math.max(0, Math.round(ratio * 10))),
  };
}

/**
 * Early-exit ratio over measured-only denominator
 * (events with videoDurationMs != null). Null when nothing measured.
 */
export function earlyExitRatio(earlyCount: number, measuredCount: number): number | null {
  if (measuredCount <= 0) return null;
  return earlyCount / measuredCount;
}
