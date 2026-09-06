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
| **Surface A** | Extension popup (540 × 580 px, decided) — glance view |
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

1. WHEN the popup opens, THEN it SHALL display in a fixed popup container (540 px width, 580 px height: `min-height: 580px` / `max-height: 580px`) using the Neuro-Spike Telemetry design system (dark background `#090d13`, monospace font, high-contrast text).
2. WHEN the popup opens, THEN it SHALL show a persistent header with three OverviewCards: `DRAINED` (total active watch time + burn rate = `totalActiveMin / elapsedMinSinceMidnight * 100`, 1 decimal, rendered in `threat-red`; when `elapsedMin < 30` show sub `CALIBRATING (<30m)` instead of a percentage), `VS YDAY` (dual delta on the threat-scale: primary time delta `+Xm`/`-Xm` in `threat-red` when worse / `accent-green` when better, secondary reel-count delta likewise, plus neutral `· DELTA` suffix), `PEAK CHANNEL` (top platform icon + active time + `% share` of today's total; intentional glance duplication of the Today rows). The legacy "Doom Score" and `LOST` labels are retired.
3. THE popup SHALL use a Tabbed interface to organize data views: `Today`, `Signals`, and `Trends`.
4. WHEN the `Today` tab is active, THEN it SHALL show a Donut chart splitting time/count by platform, and a per-platform row with platform icon + full name (`YouTube`, `Instagram`, `Facebook` — never 2-letter codes, never `CH-` codes), reel count, duration, and progress track. WHEN a platform row is clicked, THEN the popup SHALL navigate to a scoped `PlatformDetail` view (`/platform/:id`); the global header cards SHALL be hidden in scoped view so the detail owns the full 540 × 580 canvas (fallback: `.platform-detail { overflow-y: auto; overscroll-behavior: contain; }`). The detail SHALL show: back affordance, hero (Active Time + Reel Count), diagnostic grid (`Impatience %` + `of10 = round(skip/count*10)`, `Velocity reels/min`, `Avg flick = totalActiveMs/(count*1000)` s 1-decimal), one consolidated **Abandonment Telemetry** card (`BAILED <3s` filmstrip `skip/count` + `EARLY EXIT` as `early/measured measured abandoned before 50%`, measured-only where `videoDurationMs != null`), and a 24h hourly chart. Zero abbreviations in tooltips and legends everywhere (including hourly charts).
5. WHEN the `Signals` tab is active, THEN it SHALL show three KPI cards: Velocity (`reels/min`), Impatience (`%` skipped `<3s`), and Avg Flick (`avgFlickSec` per reel, global). `Longest Vortex` (longest unbroken chain with inter-reel gaps ≤ 60 s) is deferred to sessionization (Phase 2+) — it requires raw event gap inference, not rollups.
6. WHEN the `Trends` tab is active, THEN it SHALL render an hourly/daily waveform or bar chart (using Recharts).
7. WHEN the user clicks the slim bottom dock (`FULL TELEMETRY COMMAND CENTER`, 28 px) in the footer, THEN the extension SHALL open Surface B in a new tab via `chrome.tabs.create`.
8. THE popup SHALL load and render initial data within 300 ms of opening on a modern machine.
9. ALL numeric metrics and timestamps in the popup SHALL use monospace rendering.

> **Data path (Option A):** Popup SHALL request data via `chrome.runtime.sendMessage({type:"get_today_stats"})` / `get_rollups` to the Background SW. It SHALL NOT read IndexedDB directly.
>
> **Mock phase (see `tasks.md`):** while `phase = UI-mock only`, direct `import { MOCK } from data/mock` is intentional and agents SHALL NOT flag it. Brand-click `toggleState` (success/empty/error) and dead `popup/index.ts` are intentional dev scaffolding.

---

### Popup clarity revision — active acceptance criteria (September 2026)

This approved UI-mock refinement supersedes the presentation requirements in R6 AC2–7 above where they conflict. Surface B is unchanged.

1. The 540 × 580 popup SHALL lead with active time (`DRAINED · ACTIVE TIME`) and reel count. Yesterday deltas SHALL be secondary and compare the same elapsed portion of each day, with the cutoff visibly named. Burn percentage and the Peak Channel card SHALL be removed from the popup.
2. Today SHALL retain the platform-colored donut and clickable rows. Time/Count SHALL control both graphics; row bars SHALL encode share of the selected total, with a visible scale description and accessible control states.
3. Signals SHALL show Quick skips (`<3s`) and Avg time per reel, retaining platform-colored ten-cell strips and exact fractions. Velocity and psychological interpretations of skip behavior SHALL be removed from displayed metrics.
4. Hourly (formerly Trends) SHALL lead with the hourly chart and one busiest-hour annotation. LOW/ZERO/HIGH/MODERATE cards SHALL be removed. Platform detail SHALL retain measured-only early exits and a single bar chart, without duplicate Wave controls or elapsed-burn labels.
5. Platform colors SHALL remain coral/purple/cyan. Aggregate chart values and navigation SHALL use neutral emphasis; magenta identifies viewing-pattern panels. Essential text SHALL have at least 4.5:1 contrast, with readable labels and visible keyboard focus. No horizontal overflow is allowed at 540 × 580; the telemetry action SHALL remain visible while content scrolls.
6. Popup fixtures SHALL derive global totals, shares, skips, averages and hourly counts from one consistent platform dataset. The preview SHALL name a fixed as-of time; yesterday fixtures SHALL use that same cutoff. No real-data wiring is part of this revision.
7. Empty/error previews SHALL not retain populated headline metrics. Empty copy SHALL not encourage scrolling; errors SHALL provide a recovery instruction. The brand preview-state switch remains intentional.

## Requirement 7: Full Telemetry Page — Surface B

**User Story:** As a user, I want a full-page telemetry view with more detail so that I can analyse trends over 7 and 30 days and understand my patterns over time.

### Acceptance Criteria

1. WHEN Surface B is opened, THEN it SHALL display in a full browser tab using the Neuro-Spike Telemetry design system (dark chassis `#090d13`, monospace font, high-contrast text).
2. WHEN Surface B loads, THEN it SHALL feature an Instrument Control Plane (240px sidebar) and a flexible main analytical canvas. The Control Plane SHALL provide:
   - Analytical Lens selection: Macro Trajectory, Circadian Clock, Survival Curves, Session Gravity, and Dual-State Neuro Map.
   - Platform channel toggles (YouTube Coral `#ff6b4a`, Instagram Violet `#a855f7`, Facebook Cyan `#00b4d8`).
   - Daypart bin filters: Morning (06:00–12:00), Afternoon (12:00–18:00), Prime (18:00–23:00), and Graveyard (23:00–06:00).
3. WHEN Surface B loads, THEN it SHALL feature a Time Traversal Navigation bar in the canvas header with horizon tabs for `Day`, `7d`, and `30d` along with backward (`<`) and forward (`>`) date traversal buttons and a minified JSON export trigger.
4. WHEN Lens 1 (Macro Trajectory) is active, THEN it SHALL render a full-width unified ComposedChart (Line + Stacked Bars) spanning the selected horizon, showing platform volume attribution and total active time trajectory. Beneath the chart, it SHALL display a 3-column comparative benchmark grid for active platforms.
5. WHEN Lens 2 (Circadian Clock) is active, THEN it SHALL render a 24h × 7d daypart vulnerability matrix classifying consumption into Morning, Afternoon, Prime, and Graveyard (highlighted in threat-red `--threat-red`).
6. WHEN Lens 3 (Survival Curves) is active, THEN it SHALL compute and display Kaplan-Meier attention survival curves $S(t) = \prod_{t_i \le t} (1 - d_i/n_i)$ with indicators for the Critical Rejection Cliff ($t_{\text{cliff}}$) and Lock-in Threshold ($t_{\text{lock}}$).
7. WHEN Lens 4 (Session Gravity) is active, THEN it SHALL compute the Fano factor of inter-arrival gaps $\Delta t$, burst clustering, and report Cold-Start Runaway Sessions (sessions started after an idle gap $\ge 45\text{m}$ exceeding 15 continuous minutes).
8. WHEN Lens 5 (Dual-State Neuro Map) is active, THEN it SHALL classify session behavior into Frantic Foraging vs Dissociative Freeze using personal quantiles ($P_{80}$, $P_{75}$, $P_{20}$ for $\ge 7\text{d}$ history), displaying an amber calibration badge `[v0 HEURISTIC // CALIBRATING]` during days 1–6. It SHALL compute the dimensionless Compulsion Index ($(\text{Skip Rate} \times \text{Velocity}) / \bar{V}_{\text{baseline}}$) and Attention ROI (completion $>80\%$ counted measured-only, where `videoDurationMs != null`).
9. WHEN the user triggers an export from Surface B, it SHALL trigger a download of minified JSON for the current data view per Requirement 8.
10. ALL numeric metrics and timestamps in Surface B SHALL use monospace rendering.

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
