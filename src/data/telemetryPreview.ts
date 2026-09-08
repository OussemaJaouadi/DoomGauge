import type { ObservationCoverage, PreviewObservation } from '../types/telemetryPreview';
import { PLATFORMS } from '../types/models';
import { localDateKey } from '../utils/time';
import { shiftDate, startOfDay } from '../utils/telemetryPreview';
import { seededRandom } from './mock';

/** Simulated scenarios, stable for a calendar date regardless of the selected range. */
export function buildPreviewDay(date: Date): PreviewObservation[] {
  const key = localDateKey(date);
  const seed = Number(key.replaceAll('-', ''));
  const random = seededRandom(seed);
  const events: PreviewObservation[] = [];
  const starts = [8 * 60 + 10, 12 * 60 + 35, 18 * 60 + 20, 21 * 60 + 5, 23 * 60 + 15];
  starts.forEach((minute, sessionIndex) => {
    if (random() < 0.2) return;
    const start = new Date(date);
    start.setHours(Math.floor(minute / 60), minute % 60 + Math.floor(random() * 10), 0, 0);
    let cursor = start.getTime();
    const count = 8 + Math.floor(random() * 18);
    const primary = PLATFORMS[(sessionIndex + (seed % 5 === 0 ? 1 : 0)) % 3]!;
    for (let i = 0; i < count; i++) {
      const platform = i > 0 && i % 9 === 0 ? PLATFORMS[(PLATFORMS.indexOf(primary) + 1) % 3]! : primary;
      const skipped = random() < (sessionIndex === 3 ? 0.65 : 0.3);
      const durationMs = skipped ? 800 + Math.floor(random() * 2000) : 5000 + Math.floor(random() * 85000);
      const commentOpenMs = random() < 0.75 ? (random() < 0.2 ? Math.floor(random() * 18000) : 0) : undefined;
      const pause = (commentOpenMs ?? 0) + (random() < 0.15 ? 4000 : 0);
      const endedTs = cursor + durationMs + pause;
      // Bound the synthetic day's observations; real overnight grouping is supported by the adapter.
      if (endedTs >= shiftDate(startOfDay(date), 1).getTime()) break;
      events.push({ id: `${key}-${sessionIndex}-${i}`, platform, ts: cursor, endedTs, durationMs,
        videoDurationMs: random() < 0.8 ? Math.max(durationMs, 15000 + Math.floor(random() * 90000)) : null,
        skipped, commentOpenMs,
        replayCount: random() < 0.8 ? (random() < 0.12 ? 1 : 0) : undefined,
        entryRoute: i === 0 ? (sessionIndex % 3 === 0 ? 'Reels feed' : sessionIndex % 3 === 1 ? 'Home feed' : 'Direct link') : undefined });
      cursor = endedTs + 3000 + Math.floor(random() * 24000);
    }
    // Some simulated visits are followed by a shorter return, with explicit coverage between them.
    if (events.length && random() < 0.55) {
      const nextBoundary = new Date(date);
      const nextMinute = starts[sessionIndex + 1] ?? 1440;
      nextBoundary.setHours(Math.floor(nextMinute / 60), nextMinute % 60, 0, 0);
      let returnedAt = cursor + (2 + Math.floor(random() * 26)) * 60_000;
      const returnPlatform = random() < 0.75 ? primary : PLATFORMS[(PLATFORMS.indexOf(primary) + 1) % 3]!;
      for (let i = 0; i < 3; i++) {
        const durationMs = 1000 + Math.floor(random() * 15000);
        const endedTs = returnedAt + durationMs;
        if (endedTs + 60_000 >= nextBoundary.getTime()) break;
        events.push({ id: `${key}-${sessionIndex}-return-${i}`, platform: returnPlatform, ts: returnedAt, endedTs, durationMs,
          skipped: durationMs < 3000, videoDurationMs: null, entryRoute: i === 0 ? 'Reels feed' : undefined });
        returnedAt = endedTs + 4000;
      }
    }
  });
  return events.sort((a, b) => a.ts - b.ts);
}

export function buildPreviewHistory(start: Date, end: Date) {
  const events: PreviewObservation[] = [];
  for (let day = startOfDay(start); day <= end; day = shiftDate(day, 1)) events.push(...buildPreviewDay(day));
  return events;
}

/** This simulated source explicitly declares continuous coverage, including quiet time. */
export function buildPreviewDataset(start: Date, cutoff: Date): { events: PreviewObservation[]; coverage: ObservationCoverage[] } {
  return {
    events: buildPreviewHistory(start, cutoff).filter(event => event.endedTs <= cutoff.getTime()),
    coverage: cutoff > start ? [{ startTs: start.getTime(), endTs: cutoff.getTime() }] : [],
  };
}
