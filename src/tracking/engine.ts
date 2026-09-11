import { MAX_SAMPLE_GAP_MS, CLOCK_TOLERANCE_MS } from '../config/tracking';
import type { Visit } from '../types/tracking';

/** DOM adapters provide eligibility; injectable clocks keep timing testable. */
export class VisitTracker {
  private value: Visit | undefined;
  private lastMono = 0;
  private lastWall = 0;
  private active = false;

  constructor(
    private collectorId: string,
    private emit: (visit: Visit) => void,
    private id: () => string = () => crypto.randomUUID(),
  ) {}

  get current() { return this.value; }

  begin(platform: Visit['platform'], reelId: string | undefined, wall: number, mono: number) {
    this.finish(wall, mono);
    this.value = {
      id: this.id(), collectorId: this.collectorId, platform, reelId,
      startedAt: wall, observedAt: wall, activeMs: 0, intervals: [],
      revision: 0, status: 'open',
    };
    this.lastWall = wall;
    this.lastMono = mono;
    this.active = false;
    this.checkpoint();
  }

  sample(eligible: boolean, wall: number, mono: number, videoDurationMs?: number) {
    const visit = this.value;
    if (!visit) return;
    const elapsed = mono - this.lastMono;
    const wallElapsed = wall - this.lastWall;
    const continuous = elapsed > 0 && elapsed <= MAX_SAMPLE_GAP_MS
      && wallElapsed > 0 && Math.abs(wallElapsed - elapsed) < CLOCK_TOLERANCE_MS;
    if (this.active && continuous) {
      const end = Math.max(visit.observedAt, wall);
      const start = Math.max(visit.observedAt, end - elapsed);
      const previous = visit.intervals.at(-1);
      if (previous && Math.abs(previous.end - start) < 1) previous.end = end;
      else visit.intervals.push({ start, end });
      visit.activeMs += end - start;
    }
    visit.observedAt = Math.max(visit.observedAt, wall);
    if (videoDurationMs && Number.isFinite(videoDurationMs)) visit.videoDurationMs = videoDurationMs;
    this.lastMono = mono;
    this.lastWall = wall;
    this.active = eligible;
  }

  checkpoint() {
    if (!this.value) return;
    this.value.revision++;
    this.emit(structuredClone(this.value));
  }

  finish(wall: number, mono: number, status: Visit['status'] = 'completed') {
    if (!this.value) return;
    this.sample(false, wall, mono);
    this.value.status = status;
    this.checkpoint();
    this.value = undefined;
    this.active = false;
  }
}
