# Spec: DoomGauge v1 — Core Tracker

> **Version:** `doom-gauge-v1` (analysis-only, local-first)
> **Status:** active — implementation source of truth for v1
> **Docs companions:** `docs/DESIGN.md` (tokens), `docs/ARCHITECTURE.md` (overview diagram), `docs/STACK.md` (tooling)
> **Future roadmap:** `docs/FEATURES.md`

## Introduction

DoomGauge is a local-first Chrome extension for a single user managing ADHD who wants to build awareness of how much short-form video they consume daily. v1 is analysis-only — no blocking, no accounts, no cloud. It tracks reel count, active watch time, and skip behaviour across YouTube Shorts, Instagram Reels, and Facebook Reels, surfaces the data in a popup dashboard and a full telemetry page, and allows minified JSON export.

Everything runs in-browser. Data never leaves the device.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Reel view** | A single short-form video that the user was exposed to (scrolled into view or autoplay started) |
| **Active watch time** | Cumulative milliseconds during which a reel was playing (not paused, not backgrounded) |
| **Skip** | A reel exited (scroll-away or tab-close) with `durationMs < 3000` (SKIP_THRESHOLD_MS). For longer reels the raw `videoDurationMs` is also stored so the UI can show early-exit % — see `videoDurationMs` |
| **videoDurationMs** | Optional total length of the reel in ms, read from `video.duration` when available. Used to compute `watchPct = durationMs / videoDurationMs` and scary early-exit stats |
| **Daily rollup** | Per-platform aggregate of reel count, skip count, and total active ms for one calendar day (local calendar day — see Requirement 5) |
| **Doom Score** | Visual label for the two headline metrics in the popup: total active time + total reel count for today |
| **Surface A** | Extension popup (≤ 400 × 540 px) — glance view |
| **Surface B** | Full telemetry new-tab page — detailed view |
| **Content script** | Per-platform injected JS that observes DOM and tracks events |
| **Background SW** | Service Worker that receives events, persists them, and computes rollups |
| **SKIP_THRESHOLD_MS** | `3000` — shared constant; a reel with `durationMs < 3000` is a skip (strict `<`, not `≤`) |

---

## Requirement 1: YouTube Shorts Content Script

**User Story:** As a user, I want the extension to detect and time every YouTube Short I watch so that I know exactly how much attention I give to YouTube short-form content.

### Acceptance Criteria

1. WHEN the content script is injected on `youtube.com`, THEN it SHALL observe URL changes to detect navigation into and out of `/shorts/*` routes without requiring a full page reload.
2. WHILE a Short is visible (IntersectionObserver ≥ 50 % threshold) and the video element is playing (not paused, not ended), THEN the script SHALL accumulate active watch time in increments of at most 500 ms (polling interval).
3. WHEN the video element emits a `pause` or `ended` event, THEN the script SHALL stop accumulating active time immediately.
4. WHEN the `document` emits `visibilitychange` to hidden, THEN the script SHALL pause timing and resume only when visibility returns to visible.
5. WHEN the user navigates away from a `/shorts/*` URL (scroll to next, back button, URL change), THEN the script SHALL flush a `reel_view` event to the Background SW containing: `platform: "youtube"`, `videoId`, `durationMs` (accumulated active ms), `videoDurationMs?` (total length if readable), `skipped: boolean` (true if durationMs < 3000 ms), `ts` (ISO timestamp), `url`.
6. IF a reel is flushed with `durationMs === 0`, THEN the script SHALL still send the event with `skipped: true` so impression-only views are counted.
7. WHEN the content script is unloaded (tab close, extension reload), THEN it SHALL flush any in-progress reel before terminating.
8. THE content script SHALL NOT flush the same reel instance twice — an in-memory `flushed` guard SHALL ensure idempotency if navigation/visibility events fire repeatedly (enforces P1).

---

## Requirement 2: Instagram Reels Content Script

**User Story:** As a user, I want the extension to detect and time every Instagram Reel I scroll through so that I know how much time Instagram takes from my attention.

### Acceptance Criteria

1. WHEN the content script is injected on `instagram.com`, THEN it SHALL observe URL changes and DOM mutations to detect entry into the `/reels/` feed or individual reel pages.
2. WHILE a Reel video element is visible (Intersection Observer ≥ 50 % threshold) and playing, THEN the script SHALL accumulate active watch time in increments of at most 500 ms.
3. WHEN the active video element changes (scroll to next reel), THEN the script SHALL flush the previous reel's `reel_view` event before starting a new timer.
4. WHEN the `document` emits `visibilitychange` to hidden, THEN the script SHALL pause timing and resume only when visibility returns to visible.
5. WHEN a reel is flushed, the event SHALL contain: `platform: "instagram"`, `videoId` (extracted from URL or DOM attribute), `durationMs`, `videoDurationMs?`, `skipped: boolean` (true if durationMs < 3000 ms), `ts`, `url`.
6. IF Instagram's SPA navigation moves away from the Reels feed, THEN the script SHALL flush any in-progress reel and stop all observers.
7. WHEN the content script is unloaded, THEN it SHALL flush any in-progress reel before terminating.
8. THE content script SHALL NOT flush the same reel instance twice — an in-memory `flushed` guard SHALL ensure idempotency (enforces P1).

---

## Requirement 3: Facebook Reels Content Script

**User Story:** As a user, I want the extension to detect and time every Facebook Reel I watch so that I can see Facebook's share of my attention consumption.

### Acceptance Criteria

1. WHEN the content script is injected on `facebook.com`, THEN it SHALL observe URL changes and DOM mutations to detect navigation into the Reels feed (`/reels/` routes or equivalent feed sections).
2. WHILE a Reel video element is visible (Intersection Observer ≥ 50 % threshold) and playing, THEN the script SHALL accumulate active watch time in increments of at most 500 ms.
3. WHEN the active video element changes (scroll to next reel), THEN the script SHALL flush the previous reel's `reel_view` event before starting a new timer.
4. WHEN the `document` emits `visibilitychange` to hidden, THEN the script SHALL pause timing and resume only when visibility returns to visible.
5. WHEN a reel is flushed, the event SHALL contain: `platform: "facebook"`, `videoId` (extracted from URL or data attribute), `durationMs`, `videoDurationMs?`, `skipped: boolean` (true if durationMs < 3000 ms), `ts`, `url`.
6. IF Facebook's SPA navigation moves away from the Reels feed, THEN the script SHALL flush any in-progress reel and stop all observers.
7. WHEN the content script is unloaded, THEN it SHALL flush any in-progress reel before terminating.
8. THE content script SHALL NOT flush the same reel instance twice — an in-memory `flushed` guard SHALL ensure idempotency (enforces P1).

---

## Requirement 4: Background Service Worker — Event Ingestion & Storage

**User Story:** As a user, I want all reel events from every platform to be durably stored in my browser so that data is never lost and is available whenever I open the dashboard.

### Acceptance Criteria

1. WHEN the Background SW receives a `reel_view` message from any content script, THEN it SHALL write the event to the `events` IndexedDB object store within one transaction, indexed by `ts` and `platform`.
2. IF an IndexedDB write fails (quota exceeded or corruption), THEN the SW SHALL log the error to `console.error` and send an error acknowledgment back to the content script — it SHALL NOT silently drop the event without logging.
3. WHEN multiple browser windows send events concurrently, THEN the SW SHALL handle each write in its own transaction so that writes from different windows do not interfere.
4. THE `events` object store SHALL use the schema: `{ id: auto-increment, ts: string (ISO), platform: "youtube"|"instagram"|"facebook", type: "reel_view", videoId?: string, durationMs: number, videoDurationMs?: number, skipped: boolean, url: string }`.
5. WHEN the SW starts up and the `events` store does not exist, THEN it SHALL create it with the schema above during `onupgradeneeded`.

---

## Requirement 5: Background Service Worker — Daily Rollup

**User Story:** As a user, I want a daily summary of my activity automatically computed so that the dashboard always shows up-to-date totals without me having to trigger it.

### Acceptance Criteria

1. WHEN `chrome.alarms` fires the `daily-rollup` alarm (scheduled at local midnight), THEN the SW SHALL aggregate all events for the previous local calendar day per platform and upsert a `DailyRollup` record.
2. THE `DailyRollup` schema SHALL be: `{ date: "YYYY-MM-DD" (local), platform: Platform, reelCount: number, skipCount: number, totalActiveMs: number }` with a composite key `[date, platform]`. `totalActiveMs` is the sum of `durationMs` for **all** events in that bucket (including skips); `skipCount` tracks how many were skips separately.
3. WHEN the SW is installed or updated (`chrome.runtime.onInstalled`), THEN it SHALL schedule the `daily-rollup` alarm with `periodInMinutes: 1440` (24 h) if it is not already scheduled.
4. WHEN the popup or full telemetry page requests today's stats, THEN the SW SHALL compute an on-demand partial rollup from raw events for the current local day (since the last midnight alarm has not yet run) and return it alongside stored rollups.
5. IF no events exist for a given day+platform combination, THEN the rollup for that combination SHALL be omitted (no zero-filled phantom rows).

> **Note — local dates:** Storage and rollup keys are local `YYYY-MM-DD` for ADHD-friendly "today" (matches what you see). The alarm fires at local midnight. No UTC conversion is needed at display time.

---

## Requirement 6: Popup Dashboard — Surface A

**User Story:** As a user, I want a fast glance popup that shows today's doom metrics at a glance so that I can check my consumption without interrupting my workflow.

### Acceptance Criteria

1. WHEN the popup opens, THEN it SHALL display within a flexible popup container (≈540 px width, height under study — initial 540×580 for content inventory) using the Neuro-Spike Telemetry design system (dark background `#090d13`, monospace font, high-contrast text). Size is under study: content → tabs → layout → size (not the reverse).
2. WHEN the popup opens, THEN it SHALL show today's total active watch time (formatted as `Xh Ym` or `Xm Ys`) and total reel count displayed side by side as the two headline "Doom Score" metrics.
3. WHEN the popup opens, THEN it SHALL show a per-platform row for each platform with: platform icon + name (e.g. YouTube/Instagram/Facebook via `lucide-react`), reel count, active time, and a coloured progress bar using the platform accent colour. `CH-` channel codes are removed.
4. WHEN the popup opens, THEN it SHALL render a 7-day sparkline chart (uPlot) showing both a combined total line and per-platform lines.
5. WHEN the popup opens and no data exists for today, THEN it SHALL show a clear empty-state message (e.g., `NO SIGNAL FOR TODAY`) to indicate no data was recorded. IF an error occurs while fetching data, it SHALL display an error state message (e.g., `DATA ERROR`).
6. WHEN the user clicks "Open full telemetry →", THEN the extension SHALL open Surface B in a new tab via `chrome.tabs.create`.
7. THE popup SHALL load and render initial data within 300 ms of opening on a modern machine.
8. ALL numeric metrics and timestamps in the popup SHALL use monospace rendering (no font fallback to proportional fonts).

> **Data path (Option A):** Popup SHALL request data via `chrome.runtime.sendMessage({type:"get_today_stats"})` / `get_rollups` to the Background SW. It SHALL NOT read IndexedDB directly.

---

## Requirement 7: Full Telemetry Page — Surface B

**User Story:** As a user, I want a full-page telemetry view with more detail so that I can analyse trends over 7 and 30 days and understand my patterns over time.

### Acceptance Criteria

1. WHEN Surface B is opened, THEN it SHALL display in a full browser tab using the same Neuro-Spike Telemetry design tokens as Surface A.
2. WHEN Surface B loads, THEN it SHALL show a header with total active attention lost (today, formatted) and a telemetry channel status row per platform.
3. WHEN Surface B loads, THEN it SHALL render a multi-channel Spike Waveform chart (uPlot) showing per-platform reel counts over the selected time range.
4. WHEN Surface B loads, THEN it SHALL show Platform Stat Rows with platform icon + name, reel count, skip count, total active time, and coloured track for each platform. `CH-` channel codes are removed.
5. WHEN the user toggles between "7-day" and "30-day" views, THEN the charts and stat rows SHALL update to reflect the selected range without a full page reload.
6. WHEN the user clicks "Export JSON", THEN the extension SHALL trigger a browser download of a minified JSON file containing all `DailyRollup` records (plus the live partial rollup for today if any), named `doomgauge-export-YYYY-MM-DD.json` (local date).
7. ALL numeric metrics and timestamps in Surface B SHALL use monospace rendering.
8. WHEN Surface B loads and no rollup data exists, THEN it SHALL show an empty-state message (`NO SIGNAL — start scrolling to record data`) rather than broken charts. IF an error occurs while fetching data, it SHALL display a clear error state.

> **Data path (Option A):** Surface B SHALL request data via Background SW messages (`get_rollups`, `get_today_stats`). No direct IndexedDB reads from UI surfaces.

---

## Requirement 8: Data Export

**User Story:** As a user, I want to export my data as a minified JSON file so that I can inspect or back up my stats outside the browser.

### Acceptance Criteria

1. WHEN the user triggers an export (from Surface B), THEN the extension SHALL request all `DailyRollup` records from the Background SW (including the live partial rollup for today) and serialise them as a JSON array.
2. THE exported JSON SHALL be minified (no whitespace) and the file SHALL be named `doomgauge-export-YYYY-MM-DD.json` where the date is today's local date.
3. THE exported JSON SHALL NOT include raw `events` records — only rollups.
4. WHEN the export is triggered, THEN the file SHALL be offered as a browser download without requiring any server round-trip.
5. IF there are no rollup records to export, THEN the exported file SHALL contain an empty array `[]` rather than erroring.

---

## Requirement 9: Privacy & Permissions

**User Story:** As a user, I want the extension to request only the minimum necessary browser permissions so that I can trust it is not doing anything beyond tracking my scroll habits locally.

### Acceptance Criteria

1. THE extension manifest SHALL declare only the permissions strictly required: `alarms`, `tabs` (for opening Surface B), and host permissions for `*://www.youtube.com/*`, `*://www.instagram.com/*`, `*://www.facebook.com/*` (v1 scope is `www.` subdomains; broader `*://*.youtube.com/*` etc. is a future widening if needed).
2. THE extension SHALL NOT make any outbound network requests (no fetch, no XHR) except to the user's own open tabs via `chrome.tabs`.
3. THE extension SHALL NOT collect, transmit, or log any personally identifiable information (user identity, account names, video titles beyond local storage).
4. ALL data SHALL be stored exclusively in the browser profile's IndexedDB (`doomgauge-v1`) — no `localStorage`, no `sessionStorage`, no cookies, no external storage, no `chrome.storage`.
5. IF the extension is uninstalled, THEN IndexedDB data is automatically cleared by the browser; no server-side cleanup is required.

---

## Correctness Properties

The following properties must be upheld by the implementation and validated by the test suite:

**P1 — No double-counting:** A single reel view SHALL produce exactly one `reel_view` event in the database, regardless of how many times the content script flushes (idempotency on flush via in-memory guard).

**P2 — Time monotonicity:** `totalActiveMs` in any `DailyRollup` SHALL be ≥ 0 and SHALL equal the sum of `durationMs` for **all** `reel_view` events for that date+platform (skips included; `skipCount` is tracked separately).

**P3 — Skip classification correctness:** A `reel_view` event with `durationMs < 3000` SHALL always have `skipped: true`; one with `durationMs ≥ 3000` SHALL have `skipped: false`.

**P4 — Rollup completeness:** For any set of raw events, the daily rollup aggregation function SHALL produce `reelCount = events.length`, `skipCount = events.filter(e => e.skipped).length`, and `totalActiveMs = sum(events.map(e => e.durationMs))`.

**P5 — Visibility pause:** Active time accumulation SHALL NOT increment while `document.visibilityState === "hidden"` or while the video element is paused or not intersecting ≥ 50 %.

**P6 — Concurrent write safety:** Concurrent writes from multiple content script instances SHALL each be committed in independent transactions and SHALL NOT corrupt the event store (no lost writes, no partial writes visible to readers).

**P7 — Early-exit observability:** WHEN `videoDurationMs` is present, `watchPct = durationMs / videoDurationMs` SHALL be computable; Telemetry MAY surface early-exit counts (e.g. `watchPct < 0.5`) without affecting `skipped` classification.
