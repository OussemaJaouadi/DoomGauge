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
