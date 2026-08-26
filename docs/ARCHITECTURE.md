# Architecture

Few words. Diagrams first.

## System shape

```mermaid
flowchart LR
  YT[YouTube content script] --> BG[Background SW]
  IG[Instagram content script] --> BG
  FB[Facebook content script] --> BG
  BG --> DB[(IndexedDB<br/>events + rollups)]
  BG -->|chrome.alarms daily| ROLL[Aggregate rollups]
  DB --> DASH[Popup (glance)]
  DASH -->|open full| FULL[Full telemetry page (new-tab)]
  DASH -->|export| JSON[(Minified JSON)]
```

## Event lifecycle

```mermaid
sequenceDiagram
  participant CS as Content script
  participant BG as Background SW
  participant DB as IndexedDB
  CS->>CS: detect reel, start timer
  CS->>CS: visibilitychange / blur / url-change
  CS->>BG: flush reel_view{durationMs}
  BG->>DB: write event (transaction)
  BG->>BG: chrome.alarms daily
  BG->>DB: compute DailyRollup
  DASH->>DB: read rollups
```

## Storage model

```mermaid
classDiagram
  class Event {
    id
    ts
    platform
    type: reel_view
    videoId?
    title?
    channel?
    durationMs
    url
  }
  class DailyRollup {
    date: YYYY-MM-DD
    platform
    reelCount
    totalActiveMs
  }
  Event "many" --> "1" DailyRollup : aggregated by date+platform
```

## Key rules
- One shared IndexedDB per browser profile — safe across 3–4 windows.
- No backend in v1. Backend is a future, opt-in concern.
- Export = rollups only (tiny). Raw event-log export is out of scope for v1.
