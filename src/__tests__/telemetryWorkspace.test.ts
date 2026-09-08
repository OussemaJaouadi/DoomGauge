declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };
import { activeEvidence, detailReducer, DURATION_BUCKETS, evidenceEvents, evidenceReducer, evidenceTimeline, sessionDistribution, type EvidenceState } from '../utils/telemetryWorkspace';
import { observationSessions, observationTotals, scopedSessions } from '../utils/telemetryPreview';
import { summarizeViewingDistribution } from '../utils/popupActivity';
import type { PreviewObservation } from '../types/telemetryPreview';

const view = (id: string, ts: number, durationMs: number): PreviewObservation => ({ id, ts, endedTs: ts + durationMs, durationMs, platform: 'youtube', videoDurationMs: null, skipped: durationMs < 3000 });
describe('workspace evidence navigation', () => {
  test('top-card return evidence opens in every view and clears on view change', () => {
    for (const view of ['windows', 'trends', 'sessions', 'viewing']) {
      const context = `overview-7d-all-${view}`;
      for (const minutes of [5, 15, 30]) {
        const state = evidenceReducer({ context, stack: [] }, { type: 'open', context, evidence: { kind: 'returns', minutes } });
        expect(activeEvidence(state, context)).toEqual({ kind: 'returns', minutes });
        expect(activeEvidence(state, `${context}-changed`)).toBe(undefined);
        expect(activeEvidence(evidenceReducer(state, { type: 'close' }), context)).toBe(undefined);
      }
    }
  });
  test('session inspection returns to the exact original evidence selection', () => {
    const origin = { kind: 'bucket' as const, index: 2 };
    let state: EvidenceState = { context: 'overview-7d-viewing', stack: [] };
    state = evidenceReducer(state, { type: 'open', context: state.context, evidence: origin });
    state = evidenceReducer(state, { type: 'push', context: state.context, evidence: { kind: 'session', id: 'session-a' } });
    expect(activeEvidence(state, state.context)).toEqual({ kind: 'session', id: 'session-a' });
    state = evidenceReducer(state, { type: 'back' });
    expect(activeEvidence(state, state.context)).toEqual(origin);
    expect(evidenceReducer(state, { type: 'close' }).stack).toEqual([]);
  });
  test('platform, period, daypart and view changes invalidate stale evidence', () => {
    const context = 'overview-7d-all-windows';
    const state: EvidenceState = { context, stack: [{ kind: 'session', id: 'old' }] };
    for (const next of ['youtube-7d-all-windows', 'overview-30d-all-windows', 'overview-7d-PRIME-windows', 'overview-7d-all-trends']) {
      expect(activeEvidence(state, next)).toBe(undefined);
      expect(evidenceReducer(state, { type: 'push', context: next, evidence: { kind: 'session', id: 'new' } }).stack).toEqual([{ kind: 'session', id: 'new' }]);
    }
  });
  test('selecting another chart mark replaces rather than nests evidence', () => {
    const state: EvidenceState = { context: 'a', stack: [{ kind: 'bucket', index: 1 }, { kind: 'session', id: 'old' }] };
    expect(evidenceReducer(state, { type: 'open', context: 'a', evidence: { kind: 'returns', minutes: 15 } }).stack).toEqual([{ kind: 'returns', minutes: 15 }]);
  });
});
describe('workspace chart evidence', () => {
  test('session duration buckets partition boundaries and preserve parent identities', () => {
    const durations = [0, 59999, 60000, 179999, 180000, 299999, 300000, 599999, 600000, 1199999, 1200000, 1800000];
    const sessions = durations.map((duration, index) => ({ id: String(index), startTs: 0, endTs: 10000000, events: [view(String(index), 0, duration)] }));
    const buckets = sessionDistribution(sessions);
    expect(buckets.map(bucket => bucket.sessions.length)).toEqual([2, 2, 2, 2, 2, 2]);
    expect(buckets.flatMap(bucket => bucket.sessions.map(session => session.id))).toEqual(sessions.map(session => session.id));
    expect(buckets.reduce((sum, bucket) => sum + bucket.activeMs, 0)).toBe(durations.reduce((sum, duration) => sum + duration, 0));
    expect(sessionDistribution([]).every(bucket => bucket.sessions.length === 0)).toBe(true);
  });
  test('session buckets use filtered active time, not overnight elapsed spans', () => {
    const events = [view('parent', new Date(2026, 8, 1, 23, 59).getTime(), 120000), view('later', new Date(2026, 8, 2, 0, 1).getTime(), 60000)];
    const parents = observationSessions(events);
    const selected = scopedSessions(parents, [events[1]!]);
    const bucket = sessionDistribution(selected)[1]!;
    expect(bucket.sessions[0]!.id).toBe('parent');
    expect(bucket.activeMs).toBe(60000);
    expect(parents[0]!.events.length).toBe(2);
  });
  test('timeline groups multiple sessions per date and reconciles selected time', () => {
    const events = [view('a', new Date(2026, 8, 1, 12).getTime(), 10000), view('b', new Date(2026, 8, 1, 13).getTime(), 20000), view('c', new Date(2026, 8, 2, 12).getTime(), 30000)];
    const rows = evidenceTimeline(observationSessions(events), events);
    expect(rows.map(row => row.spans.length)).toEqual([2, 1]);
    expect(rows.map(row => row.activeMs)).toEqual([30000, 30000]);
    expect(rows.reduce((sum, row) => sum + row.activeMs, 0)).toBe(observationTotals(events).activeMs);
  });
  test('window clipping retains parent boundaries and identity', () => {
    const events = [view('a', new Date(2026, 8, 1, 11, 59).getTime(), 32 * 60000)];
    const parents = observationSessions(events);
    const window = { startMinute: 720, endMinute: 750, matchingDates: ['2026-09-01'], eligibleDays: 3, medianActiveMs: 1000 };
    const rows = evidenceTimeline(parents, events, window);
    expect(rows[0]!.spans[0]!.clippedStart).toBe(true);
    expect(rows[0]!.spans[0]!.clippedEnd).toBe(true);
    expect(rows[0]!.spans[0]!.session.id).toBe('a');
    expect(rows[0]!.spans[0]!.startTs).toBe(new Date(2026, 8, 1, 12).getTime());
    expect(parents[0]!.startTs).toBe(events[0]!.ts);
  });
  test('overnight spans split by day without duplicating active time', () => {
    const events = [view('a', new Date(2026, 8, 1, 23, 59).getTime(), 120000)];
    const rows = evidenceTimeline(observationSessions(events), events);
    expect(rows.map(row => row.date)).toEqual(['2026-09-01', '2026-09-02']);
    expect(rows.map(row => row.activeMs)).toEqual([120000, 0]);
    expect(rows[0]!.spans[0]!.clippedEnd).toBe(true);
    expect(rows[1]!.spans[0]!.clippedStart).toBe(true);
    expect(evidenceTimeline([], [])).toEqual([]);
  });
  test('record Back preserves highlight and selecting another session clears records', () => {
    let detail = detailReducer({ id: null, unfiltered: false, records: false }, { type: 'select', id: 'a', unfiltered: true });
    detail = detailReducer(detail, { type: 'records' });
    expect(detail.records).toBe(true);
    detail = detailReducer(detail, { type: 'back' });
    expect(detail).toEqual({ id: 'a', unfiltered: true, records: false });
    detail = detailReducer(detailReducer(detail, { type: 'records' }), { type: 'select', id: 'b' });
    expect(detail).toEqual({ id: 'b', unfiltered: false, records: false });
  });
  test('duration evidence partitions boundary observations and reconciles with popup buckets', () => {
    const events = [0, 2999, 3000, 9999, 10000, 29999, 30000, 59999, 60000, 90000].map((duration, i) => view(String(i), i * 100000, duration));
    const groups = DURATION_BUCKETS.map((_, index) => evidenceEvents(events, { kind: 'bucket', index }));
    expect(groups.map(group => group.length)).toEqual([2, 2, 2, 2, 2]);
    expect(groups.flat().map(event => event.id)).toEqual(events.map(event => event.id));
    expect(groups.reduce((sum, group) => sum + observationTotals(group).activeMs, 0)).toBe(observationTotals(events).activeMs);
    const popup = summarizeViewingDistribution(events.map(event => ({ id: event.id, platform: event.platform, startedAt: event.ts, endedAt: event.endedTs, activeMs: event.durationMs })));
    expect(groups.map(group => observationTotals(group).activeMs)).toEqual(popup.buckets.map(bucket => bucket.activeMs));
    expect(evidenceEvents([], { kind: 'bucket', index: 0 })).toEqual([]);
  });
  test('recurring evidence excludes partial dates and includes only starts inside the window', () => {
    const events = [view('before', new Date(2026, 8, 1, 7, 59).getTime(), 1000), view('inside', new Date(2026, 8, 1, 8).getTime(), 1000), view('end', new Date(2026, 8, 1, 9).getTime(), 1000), view('partial', new Date(2026, 8, 2, 8).getTime(), 1000)];
    expect(evidenceEvents(events, { kind: 'window', window: { startMinute: 480, endMinute: 540, matchingDates: ['2026-09-01'], eligibleDays: 3, medianActiveMs: 1000 } }).map(event => event.id)).toEqual(['inside']);
  });
  test('hour selection retains original session identity across the boundary', () => {
    const events = [view('parent', new Date(2026, 8, 1, 7, 59, 50).getTime(), 10000), view('in-hour', new Date(2026, 8, 1, 8).getTime(), 10000)];
    const selected = evidenceEvents(events, { kind: 'day', date: '2026-09-01', hour: 8 });
    const parent = observationSessions(events);
    const sessions = scopedSessions(parent, selected);
    expect(selected.map(event => event.id)).toEqual(['in-hour']);
    expect(sessions[0]!.id).toBe('parent');
    expect(sessions[0]!.startTs).toBe(parent[0]!.startTs);
  });
});
