import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarEvidence } from '../components/telemetry/CalendarEvidence';
import { calendarEvidence, calendarSelection, initialCalendarSelection } from '../utils/evidenceCalendar';
import type { ObservationSession, PreviewObservation } from '../types/telemetryPreview';
import { localDateKey } from '../utils/time';
import { shiftDate } from '../utils/telemetryPreview';

declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };
const ts = (date: string) => new Date(date).getTime();
function event(id: string, date: string, durationMs = 2000): PreviewObservation { return { id, ts: ts(date), endedTs: ts(date) + durationMs, durationMs, platform: 'youtube', videoDurationMs: null, skipped: durationMs < 3000 }; }
function session(events: PreviewObservation[]): ObservationSession { return { id: events[0]!.id, events, startTs: events[0]!.ts, endTs: events.at(-1)!.endedTs }; }

test('calendar distinguishes observed zero, missing coverage and partial days', () => {
  const rows = calendarEvidence(['2026-09-01', '2026-09-02', '2026-09-03'], [], [], [
    { startTs: ts('2026-09-01T00:00:00'), endTs: ts('2026-09-02T00:00:00') },
    { startTs: ts('2026-09-03T08:00:00'), endTs: ts('2026-09-03T12:00:00') },
  ]);
  expect(rows.map(row => row.status)).toEqual(['complete', 'unobserved', 'partial']);
  expect(rows.map(row => row.reels)).toEqual([0, 0, 0]);
});

test('default selects latest matching date and largest contribution with latest-start tie break', () => {
  const events = [event('old', '2026-09-01T08:00:00', 90000), event('small', '2026-09-02T08:00:00', 1000), event('large', '2026-09-02T09:00:00', 5000), event('later', '2026-09-02T10:00:00', 5000)];
  const rows = calendarEvidence(['2026-09-01', '2026-09-02', '2026-09-03'], events, events.map(item => session([item])), []);
  expect(initialCalendarSelection(rows)).toEqual({ date: '2026-09-02', id: 'later', records: false });
});

test('overnight session preserves identity but counts active time on local start date', () => {
  const events = [event('overnight', '2026-12-31T23:59:59', 5000)];
  const parent = session(events);
  const rows = calendarEvidence(['2026-12-31', '2027-01-01'], events, [parent], []);
  expect(rows.map(row => row.activeMs)).toEqual([5000, 0]);
  expect(rows.map(row => row.reels)).toEqual([1, 0]);
  expect(rows[1]!.sessions[0]).toBe(parent);
});

test('window coverage and filtered contributions do not include unrelated session views', () => {
  const first = event('first', '2026-09-01T08:00:00', 2000), other = event('other', '2026-09-01T08:01:00', 5000);
  const parent = session([first, other]);
  const rows = calendarEvidence(['2026-09-01'], [first], [parent], [{ startTs: ts('2026-09-01T08:00:00'), endTs: ts('2026-09-01T09:00:00') }], { startMinute: 480, endMinute: 540, matchingDates: ['2026-09-01'], eligibleDays: 1, medianActiveMs: 2000 });
  expect(rows[0]!.activeMs).toBe(2000);
  expect(rows[0]!.reels).toBe(1);
  expect(rows[0]!.status).toBe('complete');
  expect(rows[0]!.sessions[0]!.events.length).toBe(2);
});

test('calendar navigation restores date/session after records and clears records when changing day', () => {
  const initial = { date: '2026-09-01', id: 'a', records: false };
  const selected = calendarSelection(initial, { type: 'session', id: 'b' });
  expect(calendarSelection(calendarSelection(selected, { type: 'records' }), { type: 'back' })).toEqual(selected);
  expect(calendarSelection({ ...selected, records: true }, { type: 'date', date: '2026-09-02', id: null })).toEqual({ date: '2026-09-02', id: null, records: false });
});

test('7 and 30 day calendars render one day timeline and no month navigation', () => {
  for (const length of [7, 30]) {
    const dates = Array.from({ length }, (_, index) => localDateKey(shiftDate(new Date(2026, 11, 20), index)));
    const events = dates.map((date, index) => event(String(index), `${date}T08:00:00`));
    const html = renderToStaticMarkup(createElement(CalendarEvidence, { dates, events, sessions: events.map(item => session([item])), coverage: [], renderSession: selected => createElement('p', null, `Session ${selected.id}`) }));
    expect((html.match(/class="calendar-day calendar-day-/g) ?? []).length).toBe(length);
    expect((html.match(/class="evidence-date-row"/g) ?? []).length).toBe(1);
    expect(html.includes(`Session ${length - 1}`)).toBe(true);
    const offset = (new Date(`${dates[0]}T12:00:00`).getDay() + 6) % 7;
    expect(Math.ceil((offset + length) / 7) <= 6).toBe(true);
  }
});
