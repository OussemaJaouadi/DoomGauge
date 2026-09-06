export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h ${min}m`;
  }
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Format a time range
 */
export function formatRange(start: number, end: number): string {
  if (start === end) return `${start}:00`;
  return `${start}-${end}h`;
}

/**
 * Format a single hour
 */
export function formatHour(hour: number): string {
  return `${hour}:00`;
}

/** Local wall-clock date key `YYYY-MM-DD` (spec: local days, local export names). */
export function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
