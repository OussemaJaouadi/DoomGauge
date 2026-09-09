# Design: DoomGauge v1 — Core Tracker

> **Version:** `doom-gauge-v1`
> **Companion spec:** `.spec/doom-gauge-v1/spec.md`
> **Design tokens:** `docs/DESIGN.md` (Neuro-Spike Telemetry)
> **Tooling:** `docs/STACK.md`

## Overview

DoomGauge v1 is a Chrome extension built with WXT + React + TypeScript + Bun. It consists of three content scripts (one per platform), a Background Service Worker, a popup entry-point (Surface A, React), and a full-tab telemetry page (Surface B, React). All state lives in IndexedDB (`doomgauge-v1`). No server. No network calls. No `chrome.storage`.

The design follows an incremental, PR-by-PR delivery strategy — no big-bang scaffold. Each component is small enough to review and test in isolation.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Browser Profile                                          │
│                                                                  │
│  Content Scripts (injected per-tab)                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ YouTube CS   │ │ Instagram CS │ │ Facebook CS  │             │
│  │ (yt.ts)      │ │ (ig.ts)      │ │ (fb.ts)      │             │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
│         │ chrome.runtime.sendMessage       │                     │
│         └──────────────┬─────────────────-┘                     │
│                        ▼                                         │
│         ┌──────────────────────────┐                             │
│         │  Background SW           │                             │
│         │  (background/index.ts)   │                             │
│         │  - receives reel_view    │                             │
│         │  - writes to IndexedDB   │                             │
│         │  - computes rollups      │                             │
│         │  - serves popup queries  │                             │
│         └──────────┬───────────────┘                             │
│                    │ IndexedDB only                              │
│         ┌──────────▼───────────────┐                             │
│         │  IndexedDB               │                             │
│         │  ├── events store        │                             │
│         │  └── rollups store       │                             │
│         └──────────┬───────────────┘                             │
│                    │                                             │
│   ┌────────────────┴──────────────────┐  (Option A: UI never reads DB directly) │
│   │  BG serves via messages           │                         │
│   ▼                                   ▼                         │
│  ┌────────────────┐         ┌──────────────────────┐            │
│  │  Popup         │         │  Full Telemetry Page  │            │
│  │  (Surface A)   │  open → │  (Surface B)          │            │
│  │  popup/index   │ via     │  entrypoints/telemetry│            │
│  │  --get_today_stats/get_rollups-->  │            │
│  └────────────────┘         └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## File / Module Structure

Following WXT conventions. No scaffold — files are added incrementally.

```
src/
  background/
    index.ts              # SW entry point: message handler, alarm, DB init
    db.ts                 # IndexedDB open/upgrade logic
    rollup.ts             # aggregation pure functions (incl. watchPct helpers)
    store.ts              # typed read/write helpers (events + rollups)

  content/
    shared/
      timer.ts            # ReelTimer class (pause-aware accumulator, 500ms tick)
      flush.ts            # sendReelView() — sends message to SW (with flushed guard)
      visibility.ts       # visibility + intersection helper
    youtube.ts            # YouTube Shorts content script
    instagram.ts          # Instagram Reels content script
    facebook.ts           # Facebook Reels content script

  popup/
    index.html
    main.tsx              # React mount (WXT + React)
    App.tsx               # orchestrator — tabs + states (loading/success/empty/error)
    UPlotChart.tsx        # uPlot wrapper (responsive, tooltip, filterable legend)
    components/
      DoomScore.tsx       # headline metrics (time + count side by side, icon: value)
      PlatformRow.tsx     # platform row — icon + name (no CH-), count + time + bar
      Sparkline.tsx       # 7-day uPlot chart (combined + per-platform, filterable)

  entrypoints/
    telemetry/
      index.html
      index.ts            # full telemetry page
      components/
        SpikeWaveform.ts  # multi-channel uPlot chart
        PlatformStatRow.ts
        ExportButton.ts

  types/
    events.ts             # ReelViewEvent, DailyRollup, Platform types
    messages.ts           # message protocol types (CS → SW, Popup → SW)

wxt.config.ts
manifest.json (generated by WXT)
```

---

## Data Types

```typescript
// src/types/events.ts

export type Platform = "youtube" | "instagram" | "facebook";

export interface ReelViewEvent {
  id?: number;           // auto-increment (IndexedDB key)
  ts: string;            // ISO 8601 timestamp of flush
  platform: Platform;
  type: "reel_view";
  videoId?: string;
  durationMs: number;    // accumulated active ms you watched
  videoDurationMs?: number; // total reel length when readable (video.duration*1000)
  skipped: boolean;      // durationMs < SKIP_THRESHOLD_MS (3000) — strict <
  url: string;
}

export interface DailyRollup {
  date: string;          // "YYYY-MM-DD" (local)
  platform: Platform;
  reelCount: number;
  skipCount: number;
  totalActiveMs: number; // sum of durationMs for all events that day
}

// Helper (not stored, derived for telemetry):
// watchPct = durationMs / videoDurationMs  (when videoDurationMs present)
// earlyExit = watchPct < 0.5  (scary: bailed before half)
```

```typescript
// src/types/messages.ts

export interface FlushReelViewMsg {
  type: "reel_view";
  payload: Omit<ReelViewEvent, "id">;
}

export interface GetTodayStatsMsg {
  type: "get_today_stats";
}

export interface GetRollupsMsg {
  type: "get_rollups";
  days: number;  // 7 or 30
}

export type CStoSWMessage = FlushReelViewMsg;
export type PopupToSWMessage = GetTodayStatsMsg | GetRollupsMsg;
```

---

## Component Designs

### ReelTimer (shared/timer.ts)

A class that encapsulates pause-aware accumulation. Used by all three content scripts. Ticks every 500 ms while visible+playing.

```typescript
class ReelTimer {
  private accumulated: number = 0;
  private startedAt: number | null = null;

  start(): void       // begin or resume accumulation
  pause(): void       // stop accumulation, add elapsed to accumulated
  reset(): void       // clear state for next reel
  getMs(): number     // return total accumulated ms
}
```

- `start()` is a no-op if already running.
- `pause()` is a no-op if already paused.
- Called by: video `play`/`pause`/`ended` events + `visibilitychange` + `IntersectionObserver` callbacks.
- Flush guard: caller holds `let flushed = false` per reel instance; `flush()` checks guard so `P1` holds on PC even if SPA fires nav twice.

---

### YouTube Content Script (content/youtube.ts)

Detection strategy (unified with IG/FB — 50 % visibility + polling):

- `yt-navigate-finish` custom event (YouTube SPA event) signals route changes.
- `document.querySelector('ytd-reel-video-renderer video')` or `shorts-video` selector for the active video element.
- `IntersectionObserver (50 %)` confirms Short is actually visible; 500 ms interval accumulates while `visible + playing`.
- On route enter `/shorts/*`: attach play/pause/ended listeners + IntersectionObserver + start ReelTimer.
- On route leave or `yt-navigate-start`: flush reel, reset timer, detach listeners. `videoDurationMs` captured from `video.duration`.

```
yt-navigate-finish → is /shorts/* ?
  yes → find video element → observe intersection(50%) → attach listeners → timer.start() (when intersecting+playing)
  no  → if was tracking → flush() → reset()

IntersectionObserver(50%) + video.play  → timer.start()
IntersectionObserver exit / video.pause → timer.pause()
video.ended → flush() → reset()  (flushed guard prevents double)
visibilitychange hidden → timer.pause()
visibilitychange visible → timer.start() (if intersecting && playing)
```

---

### Instagram Content Script (content/instagram.ts)

Detection strategy:
- MutationObserver on `document.body` watching for video elements entering/leaving the Reels feed.
- IntersectionObserver (50 % threshold) on `<video>` candidates to detect which reel is active.
- URL pattern: `/reels/`.
- 500 ms tick via ReelTimer; `videoDurationMs` from `video.duration`.

```
MutationObserver sees new <video> in /reels/ feed
  → IntersectionObserver watches it
    → enters viewport (≥50%) + playing → timer.start()
    → exits viewport → flush previous → reset
    → video.pause → timer.pause()
    → video.play  → timer.start()
```

---

### Facebook Content Script (content/facebook.ts)

Detection strategy: same pattern as Instagram — MutationObserver + IntersectionObserver (50 %).
Facebook Reels URL pattern: `/reels/` or Reels section within the feed. 500 ms tick + `videoDurationMs`.

---

### Background SW (background/index.ts)

```
chrome.runtime.onMessage:
  "reel_view"      → store.writeEvent(payload) → ack
  "get_today_stats"→ store.getTodayPartial()   → respond  (Popup/Surface B only)
  "get_rollups"    → store.getRollups(days)    → respond  (Popup/Surface B only)

chrome.alarms.onAlarm ("daily-rollup"):
  → rollup.computeAndUpsert(yesterdayLocal)

chrome.runtime.onInstalled:
  → db.open()
  → schedule daily-rollup alarm at local midnight if not exists (period 1440)
```

Option A enforced: UI surfaces NEVER access IndexedDB directly; all reads go through SW messages.

---

### IndexedDB Schema

Database name: `doomgauge-v1`

**Object store: `events`**
- keyPath: `id` (autoIncrement)
- Indexes: `by_ts` (ts), `by_platform_date` (compound: [platform, tsLocalDate]) where `tsLocalDate = ts.slice(0,10)` is local YYYY-MM-DD

**Object store: `rollups`**
- keyPath: `[date, platform]` (compound, local date)
- No additional indexes needed (small dataset)

---

### Rollup Aggregation (background/rollup.ts)

Pure function — no side effects, easily testable:

```typescript
function aggregateEvents(events: ReelViewEvent[]): DailyRollup {
  return {
    date: events[0].ts.slice(0, 10), // local YYYY-MM-DD
    platform: events[0].platform,
    reelCount: events.length,
    skipCount: events.filter(e => e.skipped).length,
    totalActiveMs: events.reduce((sum, e) => sum + e.durationMs, 0),
  };
}

// Early-exit helpers (for Surface B scary stats, not affecting rollup):
function watchPct(e: ReelViewEvent): number | undefined {
  return e.videoDurationMs ? e.durationMs / e.videoDurationMs : undefined;
}
function isEarlyExit(e: ReelViewEvent, threshold = 0.5): boolean {
  const pct = watchPct(e);
  return pct !== undefined ? pct < threshold : false;
}
```

`computeAndUpsert(date: string)` reads all events for that local date from IndexedDB grouped by platform, calls `aggregateEvents` per group, and upserts into the `rollups` store.

---

### Popup — Surface A

WXT popup entry point. React (WXT + @wxt-dev/module-react) — vanilla was a brainstorm error; popup needs query/state handling, frequent data changes, and component decomposition.

Layout — decided size 540 × 580 px (fixed; `min-height: 580px` / `max-height: 580px`):
```
┌─────────────────────────────────────────────────┐
│  DOOMGAUGE (click = dev state switch, mock only)│
├────────────────────┬────────────┬───────────────┤
│  DRAINED            │  VS YDAY      │  PEAK CHANNEL │
│  total time+burn%   │  time+count Δ │  top platform │
├─────────────────────────────────────────────────┤
│  [tabs: Today | Signals | Trends]                │
├─────────────────────────────────────────────────┤
│  (Today) icon YouTube  23  ██████░░░░  18m 40s  │
│          Instagram 15  ████░░░░░░  12m 10s       │
│          Facebook   9  ██░░░░░░░░   8m 05s       │
│          (row click → scoped /platform/:id;      │
│           globals hidden, abandonment merged,    │
│           overflow-y:auto fallback)              │
│  (Signals) Velocity / Impatience cards          │
│   (Vortex deferred — needs event gap inference) │
│  (Trends) 24h stacked bars + total line,        │
│   filterable legend (full names, no abbrevs)    │
├─────────────────────────────────────────────────┤
│  [sparkline: 7-day combined + per-platform      │
│   — icon: value legend, tooltip per point,      │
│   click-to-filter series]                       │
├─────────────────────────────────────────────────┤
│  [slim dock 28px: ⤢ FULL TELEMETRY COMMAND CENTER]│
└─────────────────────────────────────────────────┘
```
No `CH-` codes and no 2-letter abbreviations — platform rows, Donut labels, hourly tooltips, and legends use `lucide-react` icon + full name (`YouTube`, `Instagram`, `Facebook`). Legend uses `icon: value`, own line for time, and tooltip on hover; legend entries are filter toggles.

Header formulas (see spec R6.2): `DRAINED` burn `totalActiveMin/elapsedMinSinceMidnight*100` with `<30m CALIBRATING` guard; `VS YDAY` dual delta with neutral `DELTA`; `avgFlick = totalActiveMs/(count*1000)`; `of10 = round(skip/count*10)`; early-exit measured-only.

Render pipeline (Option A):
1. On popup open: send `get_today_stats` to SW → render headline metrics + platform rows
2. Send `get_rollups` (days: 7) → render sparkline

---

### Full Telemetry Page — Surface B

WXT `entrypoints/telemetry` page. Opens in a new tab. All data via SW messages (`get_rollups`, `get_today_stats`).

Layout sections:
1. **Instrument Control Plane (240px Sidebar)**:
   - Lens selector: Macro Trajectory, Circadian Clock, Survival Curves, Session Gravity, Dual-State Neuro Map.
   - Platform channel toggles (`YouTube` `#ff6b4a`, `Instagram` `#a855f7`, `Facebook` `#00b4d8`).
   - Daypart bin filters (`Morning 06-12`, `Afternoon 12-18`, `Prime 18-23`, `Graveyard 23-06`).
2. **Analytical Canvas Header**:
   - Title (`DOOMGAUGE TELEMETRY // INSTRUMENT RACK`) + active time slice summary.
   - Time Traversal: `Day`, `7d`, `30d` tabs + `◀ PREV` / `NEXT ▶` stepping buttons.
   - Action buttons: `[⤓ Export JSON]`, `[✕ Close]`.
3. **Dynamic Lens Canvas**:
   - Lens 1: Macro Trajectory (full-width Recharts `ComposedChart` stacked bars + line) + 3-column platform benchmark.
   - Lens 2: Circadian Vulnerability Clock (24h × 7d daypart matrix with Graveyard `--threat-red` highlight).
   - Lens 3: Kaplan-Meier Attention Survival Curves ($S(t)$ with $t_{\text{cliff}}$ and $t_{\text{lock}}$ markers).
   - Lens 4: Session Gravity & Burstiness (Fano factor of inter-arrival gaps + Runaway Horizon cold-start sessions $>15\text{m}$).
   - Lens 5: Dual-State Neuro Map (Frantic Foraging vs Dissociative Freeze with 7-day quantile calibration guards, dimensionless Compulsion Index, and Attention ROI).

---

### Export

`ExportButton` component (Option A):
1. Sends `get_rollups` + `get_today_stats` to SW to collect persisted rollups + live partial rollup for today.
2. `JSON.stringify(rollups)` (minified, no indent).
3. Creates a `Blob` → `URL.createObjectURL` → `<a download>` click.
4. Filename: `doomgauge-export-${todayLocal()}.json` (local YYYY-MM-DD).

---

## Property-Based Tests

Tests live in `src/__tests__/` and run with `bun test`.

| Property | Test approach |
|----------|--------------|
| P1 — No double-counting | Given N flush calls for same reel, assert exactly 1 event written (guard) |
| P2 — Time monotonicity | Generate random `durationMs[]`, assert rollup `totalActiveMs` equals sum of all |
| P3 — Skip classification | Generate random durations, assert `skipped === (durationMs < 3000)` |
| P4 — Rollup completeness | Generate random events, assert `reelCount`, `skipCount`, `totalActiveMs` |
| P5 — Visibility pause | Simulate pause/resume + intersection exit sequences, assert `timer.getMs()` matches expected |
| P6 — Concurrent write safety | Parallel write promises, assert all events present after settle |
| P7 — Early-exit observability | Generate events with videoDurationMs, assert watchPct and isEarlyExit correctness |

---

## Extension Manifest (wxt.config.ts / generated)

```json
{
  "manifest_version": 3,
  "permissions": ["alarms", "tabs"],
  "host_permissions": [
    "*://www.youtube.com/*",
    "*://www.instagram.com/*",
    "*://www.facebook.com/*"
  ],
  "background": { "service_worker": "background/index.js" },
  "action": { "default_popup": "popup/index.html" },
  "content_scripts": [
    { "matches": ["*://www.youtube.com/*"], "js": ["content/youtube.js"] },
    { "matches": ["*://www.instagram.com/*"], "js": ["content/instagram.js"] },
    { "matches": ["*://www.facebook.com/*"], "js": ["content/facebook.js"] }
  ]
}
```

> **Note:** v1 host permissions are `www.`-scoped. Widening to `*://*.youtube.com/*` etc. is deferred until needed. No `storage` permission — IndexedDB only. `alarms` wakes SW at local midnight; `tabs` only to open Surface B.

---

## Key Design Decisions

### Surface B page rebuild

Intervention refinement: Patterns delegates pure session concentration, coverage-qualified return pairing and ranked recurrence to a separate insight adapter. Preview datasets declare covered timestamp intervals; quiet covered periods differ from missing data. Return origins are selected parent sessions; targets are found from unfiltered history. Each threshold requires full follow-up coverage. The original charts live in a collapsed Period details disclosure. TelemetryFilters owns only disclosure state and receives controlled date/range/daypart values. Its contextual sticky row stays near the analysis tabs. Production `ts` is currently specified as flush time, unlike preview start time: future ingestion must add reliable observation start/end fields and coverage before using these analyses.

The telemetry shell owns an in-memory `sidebarCollapsed` state. An edge-mounted, labeled toggle switches desktop navigation to a 72px icon rail; narrow layouts keep horizontal icon navigation. Native title/ARIA labels preserve navigation meaning when text hides. CSS grid resizing lets existing chart ResizeObservers adjust without recreating page state.

The approved R7 mock rebuild replaces mathematical lenses with Overview/platform pages and Patterns/Sessions/Viewing tabs. A new telemetry preview module generates stable per-date completed observations with explicit ends and optional mechanics metadata. Pure presentation adapters own period filtering, derived rollups, parent session identity, recurrence and empirical duration curves. Time and reel attribution use the observation's local start date/hour; full active duration belongs to that observation, explicitly disclosed in chart hints. Recurrence considers completed observed dates only and joins adjacent qualifying half-hours without wrapping across midnight. Historical windows end at local day end; comparisons use the same final-day time cutoff as the selected window. Unselected platform events remain available for session context. The shell owns per-page date/tab state and a common daypart selection; chart components receive filtered observations rather than independently filtering rollups. Preview-only types and generators do not change production contracts or popup fixtures.

### Popup viewing distribution extension

The approved viewing-distribution criteria extend Signals within the existing popup visual system. A pure `summarizeViewingDistribution` helper aggregates cutoff-filtered `PopupMockView` observations into five active-duration buckets, with count/time shares and a median (null for no observations). Both bars use identical ordered buckets and an exact 0–100% scale; amber retains quick-skip meaning and cobalt shades encode the remaining duration buckets. A shared interactive legend exposes zero-width buckets and an inline detail readout on hover, focus or selection. The existing average is paired with the median. `TemporalDaySummary` adds `activeConcentrationPct`; the session card labels both day shares explicitly and calls residual elapsed time pauses/gaps. Production schemas remain unchanged.

### Popup facts and activity revision

The approved popup facts criteria in R6 supersede the old popup wireframes. Keep the fixed chassis and platform palette. Today integrates a compact share donut with interactive tooltips and actionable platform rows. Signals exposes only observed skip (with prominent % badge) and average-watch measurements, with `<Hint>` icon popovers. Hourly is preserved as a visual 24h histogram chart with peak vulnerability hour annotation to honor ADHD glanceability requirements (docs/PSYCHOLOGY.md).

`PopupMockView` is local to the popup model: `{ id, platform, startedAt, endedAt, activeMs, videoDurationMs? }` with epoch-millisecond timestamps. `PopupActivitySession` carries a stable first-view ID, start/latest end, activeMs, reelCount and participating platforms. Pure grouping sorts by start, joins gaps ≤60,000ms against the latest end, and selects most-active by descending activeMs then ascending start. Active time is the sum of recorded per-view time (overlapping observations are not silently deduplicated); elapsed is end minus start. This preview contract does not change the production event/message schema.

`popupMock.ts` builds deterministic today/yesterday views through a fixed local 22:00 cutoff, derives the existing popup adapter shapes and sessions, and leaves telemetry fixtures untouched. Per-platform hourly counts count view starts; future hours are not displayed. Early-exit labels derive only from finite positive video lengths. Scoped CSS, opt-in shared component props and explicit focus restoration preserve other surfaces. System monospace replaces popup network fonts.

### Approved popup clarity revision (September 2026)

R6's popup clarity revision supersedes the earlier three-card popup wireframe and metric labels in this document. Use a two-column active-time/reel-count headline with secondary same-cutoff yesterday deltas. Keep the donut beside its legend and use matching time/count shares in the platform rows. Signals contains Quick skips and Avg time per reel; Hourly contains the chart and busiest-hour annotation. Detail contains two primary and two secondary metrics, measured-only early exits, and bars only.

The popup owns its readable text variables, typography adjustments and fixed-height scroll layout; shared telemetry tokens remain unchanged. Its bottom telemetry action stays outside the scrolling content. `src/data/popupMock.ts` owns internally consistent popup-only fixtures and a fixed 22:00 comparison cutoff; existing Surface B fixtures are untouched. This is still the mock phase.

| Decision | Rationale |
|----------|-----------|
| React (WXT + @wxt-dev/module-react) in popup/telemetry | Vanilla was brainstorm error — popup needs query handling, frequent data changes, state management, and component decomposition; React bundle impact is negligible vs DX |
| Shared `ReelTimer` class (500 ms tick + intersection) | Avoids duplicating pause-aware logic across 3 content scripts; matches spec increments |
| Pure `rollup.ts` functions | Trivially testable with `bun test` without needing a real browser |
| Compound IndexedDB key on rollups (local date) | Eliminates secondary index query; ADHD-friendly "today" matches wall clock |
| `chrome.alarms` for daily rollup at local midnight | Service Workers are ephemeral; alarms wake the SW reliably at local midnight |
| 500 ms polling interval | Sub-second responsiveness without saturating the event loop |
| Skip threshold = 3 000 ms + videoDurationMs | `<3s` = impression-only skip; `videoDurationMs` enables scary early-exit % without changing skip definition |
| Option A (BG as sole DB reader) | Single source of truth, no UI/DB race, multi-window safe |
# Telemetry refinement follow-up

The compact shell places TelemetryFilters beside the page title, consolidates dates and cutoff, and separates the readout strip from unboxed analysis navigation. Chart rows use tighter spacing and fewer nested backgrounds. The controlled daypart popover uses native checkboxes and an indeterminate All day control. App stores selected dayparts in canonical order; one observation-selection predicate feeds current and comparison metrics and export. Patterns uses a compact responsive grid with session contributions, top-three recurring windows (expandable), and a horizontal return-rate row. No inner insight tabs; measurement hints and drill-downs remain.

The reusable `ui/Clock` renders local system time independently in the page header with semantic time markup and tabular digits. The selected period and fixed preview cutoff remain in TelemetryFilters.

## Analysis workspace implementation

`PageSelection.view` replaces tab state with windows/trends/sessions/viewing. The canvas renders one question at a time and emits Evidence selections (window, day/hour, session, duration bucket, returns, curve). Reducer open replaces a selection, push retains Back context, close empties it; a mismatched context exposes no evidence. Drawer selection never updates App navigation. Window/day/bucket evidence uses selected views while parent session identity and unfiltered return targets stay intact. Horizontal ranked bars use active-time lengths and platform segments; trends align current and previous active minutes. Viewing uses the popup bucket boundaries with count/time switching. All evidence panels share the responsive drawer.

Visual evidence revision: 1120px main content, shared metric surface with 36px values/14px labels, 56px main rows. Modal width is clamp(720px,68vw,1040px), full viewport below 900px. Grouped timeline rows use selected active totals and original parent span geometry; faded spans are outside evidence selection. Session selection adds one detail beneath the overview. Return pairs share an elapsed-time scale and display gaps. Native modal containment and focus restoration remain; records replace body content with Back preserving highlight. No explanatory details/summary controls in evidence.

OverviewCard reuse supersedes the custom summary plate: desktop columns 1fr/1fr/1fr/1.7fr with Returns last, two columns below 1000px and one below 560px. Cards use 12px padding/gaps, 28px values, 14px labels and 13px supporting text. Active/reels use signed delta configuration; quick skips use sub; Returns uses React-node value for three actions and icon for the coverage Hint. The existing ChoiceGroup supplies visible view navigation. Main content keeps its 1120px cap with margin:0.

Clarity revision implementation: add teal OverviewCard accent and derive default accent from explicit trend; signed gain colors use separate usage tokens. ReturnsControl replaces the Returns OverviewCard. Session distribution bins are [0,1m),[1m,3m),[3m,5m),[5m,10m),[10m,20m),[20m,infinity), classified by selected active time, with exact counts and typed sessionBucket drill-down. Shared Hint portals inside the owning dialog to stay in its modal layer, otherwise the surface root; fixed clamped/flipped placement avoids overflow ancestors. Comparisons and coverage remain accessible through concise hints.
# Scannable hint refinement

Calendar evidence refinement: pass selected dates/coverage through the existing drawer interface. Derive selected-day totals, matching parent spans and complete/partial/unobserved coverage in a pure helper. CalendarEvidence owns date, session and records state; default to latest matching date and largest daily contribution, ties by latest start. Use seven columns with weekday alignment and at most six rows for a 30-day range; show one clipped day timeline and a bounded session-label selector beside the calendar. Details receive only selected-day events while records retain full session events. The existing drawer context/evidence key invalidates calendar selection.

Reel-record table refinement: the extracted ReelRecords component uses a bounded 440px scroll region, sticky semantic headers, separate local date/time, platform markers and right-aligned tabular durations. Visible filters precede the table; range/count, page size and navigation follow it. Multi-platform/date controls appear only when applicable. Pure filterReelRecords and recordPage helpers preserve source data and bound rendered rows; empty filtered results retain filter controls for recovery.

The backward-compatible Hint text prop accepts strings or labeled facts with one optional note. HintBody uses semantic dl/dt/dd markup; measurementHints centralizes static copy and hintFacts constructs date/coverage rows. Keep fixed portal ownership, dismissal and viewport placement. Values wrap in a 13px grid without truncation. Previous-period chart lines, legend samples and tooltip markers use --chart-previous (#e9c46a), independently of usage accents. The call-site audit is recorded in docs/DESIGN.md.

Record pagination refinement: place count, 10/25/50 row choices and page navigation between filters and the table viewport. Default to 10 rows; controls remain outside the table scroll region.

Settings foundation: bottom sidebar navigation reuses existing icon, collapsed, active and focus styles. A separate app destination renders SettingsPage in the shared capped content shell, replacing filters and workspace while keeping parent-owned analysis state. Minimal heading and placeholder sentence only.

Settings mock: use visible period choices and platform buttons above two aligned limit rows. Each row has a metric icon, labeled numeric value/unit and independent switch. A concise combined-rule summary and inline message preview follow; urgent red appears only in the preview. Stack numeric inputs under labels on narrow screens. Mark unsaved/non-enforced status once beside the page heading. No nested tabs, save controls or fake enforcement.

Fluid width correction: analysis-content uses width:100%, min-width:0 and margin:0; remove shared and workspace max-width caps. SettingsPage also uses width:100% and min-width:0. Keep existing sidebar tracks, padding breakpoints and component-level input/overlay bounds.

Range-specific calendar refinement: derive week mode from <=7 dates, omit weekday-grid padding and use a full-width chronological strip plus inspector below. Longer ranges retain weekday-aligned cells beside the inspector. Reuse calendar data and selection reducers unchanged; only bar orientation, cell detail and layout differ. The shared maximum governs both bar types; month labels retain exact values in accessible descriptions and the day inspector.

Calendar grid correction: shared grid background supplies one-pixel rules; cells have no individual border or radius. Place weekday headings outside date buttons, complete monthly weeks with blank cells and preserve seven columns in a contained horizontal scroll region. Date numbers lead over muted measurements; selection uses inset outline plus tint.

Shared state implementation: StateRegion takes id, label, shape, optional skeletonCount, actual UIState/empty reason, allowed reasons and recovery callbacks. StatePreviewProvider registers mounted regions and supplies overrides/presets; whole-page non-normal overrides take precedence. Reset removes overrides and data presets; regional Retry removes its own and governing page override, keeping sibling overrides. Empty reasons are activity, filters, history, followup, unobserved, session and settings. Skeleton decorations are aria-hidden inside one labeled status; regions use aria-busy. Error boundaries retry normal child rendering and log exceptions. Shared AnalysisPanel supports retained chart callers as well as the active curve.

State-region inventory:
- Popup: overview metrics; platform donut/list; quick skips, viewing distribution and average; hourly session summary and chart; platform headline/secondary metrics, abandonment and hourly chart. Header, tabs, platform Back and telemetry footer remain outside states.
- Telemetry: each overview metric; Returns; windows/trends/sessions/viewing canvas. Sidebar, page filters, view navigation and Settings destination remain outside states.
- Evidence: totals, return summary, calendar, selected-day inspector, interval timeline, return pairs, selected session, measured mechanics, duration curve and record viewport. Record filters/pagination and overlay Close/Back remain available. Skeleton table rows are clipped to the existing 440px viewport bound.
- Settings: configuration skeleton/error/restore-defaults preview; normal inline validation remains unchanged. No saved-settings API or persistence is implied.

### Shared theme implementation
Palette SSOT: `src/theme/palette.ts`; `components/tokens.ts` exports CSS references for charts. `theme/client.ts` installs root tokens before either app mounts and tracks OS/runtime changes. `theme/controller.ts` owns optimistic selection, serialized saves and retry state. `ThemeControl` lives outside mock Settings StateRegion. The minimal background handles validated extension-page theme messages and broadcasts after IndexedDB commit. `theme/storage.ts` adds preferences without replacing existing stores. Save failures keep local selection; startup failures use System after bounded waiting.

Settings uses a 1040px content-container breakpoint for configuration beside the existing summary/preview. Low-specificity telemetry resets allow component heading, input and table spacing to win. Native controls, overlay scrims, hint surfaces and chart fills inherit root theme roles.

### Live collection implementation
`Visit` carries a stable random ID, collector identity, platform/optional reel identity, started/observed timestamps, cumulative active intervals/time, revision, optional measured video length, and open/completed/interrupted status. Stored records add authenticated tab/document identity and receipt time. Background validates and transactionally upserts monotonic revisions; immutable interval prefixes prevent historical rewrites. Timing gates require focused/visible/intersecting/playing/non-buffering media, with 500ms sampling and immediate media-event transitions. Two-second foreground checkpoints and state-change snapshots share a latest-per-visit retry outbox.

Add visits, trackingCoverage, trackingMeta and rollups stores through version discovery/additive upgrade, retaining preferences/legacy stores. Query/maintenance reconstruct dirty summaries. Startup/minute probes protect surviving active visits; abandoned records older than 10 seconds become interrupted without adding time. Only successful commits acknowledge a visit. Coverage records consecutive verified focused collector heartbeats (<5 seconds apart); it never spans worker restart, focus change or unknown detector state. No inferred offline coverage.

UI adapters retain observation IDs and clip active intervals by day/hour/daypart, with count-in-scope separate from time contribution. Normally completed observations supply quick-skip denominators. Popup and telemetry query the same database through background messages and refresh every two seconds while visible; historical date ranges are bounded. Development fixtures require a dev-only mock query parameter or explicit data preset. Native record tables show visit status. Mock stop-loss and optional mechanics are unchanged.
