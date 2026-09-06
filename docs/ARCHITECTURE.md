# Architecture

Popup mock refinement (September 2026): `src/data/popupMock.ts` supplies one internally consistent platform dataset, derived headline/hourly values and same-cutoff yesterday fixtures. This is UI-only; production message/storage architecture and Surface B fixtures are unchanged. Popup readability overrides are scoped to its container.

Few words. Diagrams first.

## System shape

```mermaid
flowchart LR
  YT[YouTube content script] --> BG[Background SW]
  IG[Instagram content script] --> BG
  FB[Facebook content script] --> BG
  BG --> DB[(IndexedDB<br/>events + rollups<br/>doomgauge-v1)]
  BG -->|chrome.alarms daily<br/>local midnight| ROLL[Aggregate rollups]
  BG -->|get_today_stats / get_rollups<br/>Option A: sole reader| DASH[Popup (glance)]
  BG -->|get_rollups| FULL[Full telemetry page (new-tab)]
  DASH -->|chrome.tabs.create| FULL
  BG -->|export rollups + live today| JSON[(Minified JSON)]
```

## Event lifecycle

```mermaid
sequenceDiagram
  participant CS as Content script
  participant BG as Background SW
  participant DB as IndexedDB
  participant UI as Popup / Telemetry
  CS->>CS: detect reel, start timer (500ms tick, 50% visible + playing)
  CS->>CS: visibilitychange / IntersectionObserver / url-change
  CS->>BG: flush reel_view{durationMs, videoDurationMs?}
  BG->>DB: write event (transaction)
  BG->>BG: chrome.alarms daily (local midnight)
  BG->>DB: compute DailyRollup (local YYYY-MM-DD)
  UI->>BG: get_today_stats / get_rollups
  BG->>DB: read rollups + partial today
  BG->>UI: respond
```

## Storage model

> Canonical types: `.spec/doom-gauge-v1/design.md#data-types` and `.spec/doom-gauge-v1/spec.md` (Requirements 4–5).

```mermaid
classDiagram
  class Event {
    id: autoIncrement
    ts: ISO string
    platform: youtube|instagram|facebook
    type: reel_view
    videoId?
    durationMs: number
    videoDurationMs?: number
    skipped: boolean
    url: string
  }
  class DailyRollup {
    date: YYYY-MM-DD (local)
    platform: Platform
    reelCount: number
    skipCount: number
    totalActiveMs: number
  }
  Event "many" --> "1" DailyRollup : aggregated by date+platform (local)
```

## Key rules
- One shared IndexedDB (`doomgauge-v1`) per browser profile — safe across 3–4 windows. **Option A:** only Background SW reads/writes IndexedDB; Popup/Telemetry request via `chrome.runtime.sendMessage`. No direct `DASH->DB` reads.
- IndexedDB only. No `chrome.storage`, no `localStorage`, no cookies.
- No backend in v1. Backend is a future, opt-in concern.
- Export = rollups + live partial rollup for today (minified). Raw event-log export is out of scope for v1.
- **Rollup rule:** `totalActiveMs = sum(durationMs)` for **all** events (skips included); `skipCount` where `durationMs < 3000` tracked separately. Date key is **local** `YYYY-MM-DD`; alarm fires at **local midnight**. `videoDurationMs` enables scary `watchPct = durationMs / videoDurationMs` and early-exit stats without affecting rollup.
