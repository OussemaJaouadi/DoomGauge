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

### Popup facts and activity revision — approved implementation

This popup-only revision supersedes conflicting earlier popup presentation requirements and the sessionization deferral for **mock previews only**. Surface B and production tracking remain unchanged.

1. Today leads with `Active time` and `Reels` with calm neutral OverviewCards and secondary `vs yesterday @ HH:MM` comparisons. Zero deltas are neutral. A compact donut with interactive hover tooltips and clickable platform rows form one share breakdown, controlled by Time/Count; no repeated headline totals or separate percentage legend.
2. Signals shows Quick skips (`<3s`, exact count/total, prominent amber percentage badge and platform filmstrips) and Average time per reel. No compulsion percentage, psychological classification or asserted dopamine mechanism. Accessible `<Hint>` icon buttons trigger high-contrast popovers on demand explaining measurement details and limits.
3. Hourly tab provides a visual 24h histogram chart with an Electric Cobalt (`#4f80ff`) All Platforms master line, paired with non-redundant session load telemetry: Worst Vortex (deepest runaway window, reel count, active vs elapsed time) and Load Concentration (% of total daily doom swallowed in a single sitting). No clock or sleep assumptions are made; chart meta reports total sessions and average session duration per docs/PSYCHOLOGY.md.
4. A deterministic timestamped popup fixture supplies ID, platform, start/end, active milliseconds and optional video length for each view. All popup aggregates (including measured-only early exits and sessions) derive from those views. Yesterday uses a separate observation set through the same local cutoff. Views after the fixed preview cutoff are excluded. Session active time sums recorded viewing time; elapsed time measures start-to-end including breaks. Recurring multi-day windows and real session ingestion remain deferred.
5. At 540 × 580, essential supporting text is at least 12px and 4.5:1 contrast. The body scrolls without horizontal overflow and the telemetry action remains pinned. Entry to detail focuses its Back button; Back restores the originating platform row. Dismissing inline help restores its trigger. Reduced motion removes decorative entrance/width transitions while retaining visible state changes.
6. Popup fonts use the existing system monospace fallback with no remote font requests. Shared component adjustments are opt-in or scoped to the popup. Empty/error previews hide populated metrics and provide plain recovery guidance.
7. Validate 59/60/61-second gaps, pauses, overlaps, platform changes, empty data, ties, fixture reconciliation, cutoff handling, zero deltas, keyboard flow, all preview states and actual 540 × 580 rendering before marking done.

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

### Popup viewing distribution — approved preview extension

1. Signals SHALL add two aligned 100% stacked bars for share of reels and share of active watch time, grouped by active viewing duration: `<3s`, `3–<10s`, `10–<30s`, `30–<60s`, `≥60s`. Exact boundaries belong to the next bucket. Video length is not used.
2. Hovering a segment or hovering, focusing or selecting its labeled legend button SHALL reveal that bucket's reel count, active time and both percentage shares. Empty buckets remain accessible in the legend. Zero denominators show unavailable shares without fabricated segments.
3. Signals SHALL retain quick-skip platform strips, average watch time and icon hints; median watch time SHALL accompany the average. All measurements derive from the same cutoff-filtered observations, with no inferred mental states.
4. Worst Vortex SHALL show separately labeled shares of today's reels and active time, calculated for the session selected by greatest active time. Elapsed-minus-active SHALL be labeled pauses/gaps, not measured comments; elapsed SHALL be labeled session span.
5. Preserve popup colors, donut hover, hourly chart, navigation and pinned footer. This extension is preview-only; no storage, background messages or Surface B behavior changes.

### Surface B rebuild — approved mock acceptance criteria

#### Approved intervention-insights refinement

#### Approved analysis workspace replacement (supersedes the card/tab layout above and below)

- Scannable-hint revision: previous-period charts use warm gold #e9c46a with matching dashed legend/tooltip samples. Hint accepts either existing plain text or structured label/value rows plus one optional qualification. Migrate direct callers and AnalysisPanel wrappers across popup, telemetry and retained components; preserve mathematical qualifications, dynamic dates/coverage and portal/dismissal behavior. Use 13px semantic definition lists with wrapping, no truncation or extra navigation. Validate rendering, geometry and contrast without browser automation.

- Reel-record table refinement: extract a reusable records table while preserving the session evidence scope and Back action. Render 10 rows by default, with 10/25/50 row controls and first/previous/next/last pagination above the table, outside its scrolling region. Provide visible multi-platform toggles when multiple platforms exist, quick-skip filtering (<3s active), and inclusive local start-date filters for multi-day records. Sort Started, Active and Elapsed; default chronological. Reset page on filter/sort/page-size changes, clamp it when data shrinks, and distinguish empty results from empty data. Use semantic headers, sortable-header accessibility, tabular right-aligned durations, separate date/time display and bounded scrolling with sticky headers. Validate large datasets, date/threshold boundaries, stable sorting and pagination without browser automation.

- Calendar evidence refinement: for multi-day window and duration/session bucket evidence, replace the date lane list with a seven-column calendar (at most six rows for 30 consecutive dates), selected-day timeline and adjacent session inspector. Stack below 800px overlay width. Cells show compact active time and proportional bars; distinguish observed zero, partial and unobserved dates. Default to latest matching date and largest contributing session (latest start breaks ties). Provide bounded 180px session labels with start time/reel count; switching dates updates details directly. Keep session records Back state, full parent identities, local start-date totals and overnight clipping. Preserve direct-session, single-day, returns and curve flows. Validate state, coverage, boundaries, totals and rendering without browser automation.

- Range-specific evidence dates: up to seven selected dates use a full-width chronological week strip above the day inspector, each button showing weekday/date, exact active time, reel count and a vertical active-time bar on one shared scale. Wrap to four columns on narrow containers without navigation or hidden dates. Longer ranges retain the seven-column weekday-aligned calendar beside the inspector, with compact time values/horizontal bars and a visible selected date-range label. Keep unobserved values, partial coverage markers, selection behavior and one-day timeline rendering consistent. Week metrics use four columns when space permits; narrow and monthly inspectors retain two. Validate 7/30-day rendering distinctions and existing data/state tests without browser automation.

- Fluid page-width correction supersedes earlier main-content width caps: telemetry content fills the available main column beside the expanded/collapsed sidebar, left-aligned with existing responsive padding. Remove the shared 1120px/1600px caps and Settings' nested 860px cap. Preserve bounded evidence overlays, popovers, numeric inputs, existing responsive layouts and popup geometry. Validate CSS ownership and production build without browser automation.

- Settings mock revision: replace the foundation sentence with interactive, unsaved stop-loss configuration. Provide visible daily/per-session choices, combined platform multi-selection, independent enabled reel-count and active-minute thresholds, and an inline message preview. Default to daily, all platforms, 100 reels and 30 active minutes enabled; these are illustrative values, not recommendations. Each enabled threshold triggers independently; no enforcement, tracking, persistence or real blocking. Allow positive whole-number thresholds (reels 1–10000, minutes 1–1440), show invalid/empty input locally and disable preview for invalid enabled limits or no selected platforms/limits. Mark the mock once near the heading, keep units and short measurement Hints, and show future AI analysis/tab-switch tracking as a compact noninteractive note. Preserve the existing shell, palette, sidebar and analysis behavior. Validate inputs, combinations and build without browser automation.

- Settings foundation: add an accessible gear-icon Settings destination at the sidebar bottom, including collapsed state and active styling. Render an isolated Settings page in the existing left-aligned shell with only its heading and “Preferences and limits will live here.” Hide analysis filters/export/charts there. Keep app destination separate from platform scope, preserve analysis selections on return and close evidence when leaving analysis. Remove the sidebar simulated-observations notice, dot, tooltip and unused styles. No preference storage, stop-loss controls/enforcement, new dependencies or preview-data changes. Validate navigation structure, state ownership, responsive/collapsed styles, typecheck and build without browser automation.

- Returns tile refinement: present each 5/15/30-minute rate as its own compact clickable tile, with a bounded surface, threshold label, percentage and small 0–100% indicator. Use a consistent blue accent rather than implying different risk levels. Preserve unavailable values, shared Hint, focus states and evidence actions; do not reuse OverviewCard or KpiCard for these tiles.

- Clarity revision: generalize OverviewCard with working amber/teal/blue/neutral accents. Increased usage is amber, decreased teal, unchanged neutral with signed deltas in popup and telemetry; urgency red remains separate. Returns is a standalone aligned control. Hints escape scrolling ancestors via a fixed portal inside the owning modal (or surface root), clamp/flip to viewport, and consume Escape before drawer dismissal. Use concise measurement/denominator/qualification copy. Trends uses brighter chart shades and solid 3px current versus light dashed 2px previous. Sessions becomes a count distribution in <1m,1–<3m,3–<5m,5–<10m,10–<20m,≥20m buckets of selected active session time; bin inspection retains parent identities. Validate bucket boundaries, hint geometry/dismissal and contrast, without browser automation.

- OverviewCard reuse supersedes custom summary styling: left-align the capped content using margin:0. Render Active time, Reels, Quick skips and Returns with the shared OverviewCard in columns 1fr/1fr/1fr/1.7fr, 12px gaps/padding, 28px values, 14px labels and 13px support text. Returns is visible in every view with direct 5/15/30-minute evidence actions; show denominators in Hint. Replace View dropdown with one visible ChoiceGroup. Two columns below 1000px, one below 560px. Preserve popup card styles and wide evidence overlay; calculate return rates once for cards and evidence.

- Visual evidence refinement supersedes split drawers: main content is capped at 1120px, headline values are 36px on a shared summary surface, and chart rows target 56px. Evidence always opens in a right modal overlay (68vw, 720–1040px; full width below 900px), preserving main geometry/scroll. Window/day/bucket evidence groups sessions on a shared clock axis by date, with one selected detail below. Window axes zoom to the selected interval; clipping and overnight spans retain parent identities. Return evidence uses paired intervals and a labeled gap. Explanations use Hint icons; no explanatory details/summary controls. Raw reel records are an explicit in-overlay action with Back. Validate grouping, clipping, totals and selection transitions without browser automation.

- Retain platform sidebar, local clock, compact period/daypart controls and preview data. Replace tabs and stacked cards with one View selector (Time windows default, Trends, Sessions, Viewing), one main canvas and a reusable evidence drawer. Header readouts are active time, reels and quick skips.
- Day Time windows shows session intervals; 7/30-day windows rank qualifying intervals by selected completed-day active time with frequency. Trends shows active time against the matched previous period. Sessions ranks selected active time with platform segments. Viewing uses the existing duration bucket boundaries and count/time control; exact duration curves open in the drawer.
- Window/day/bucket selections open contributing sessions in place; session selection opens sequence and measurements with Back to the evidence list. Return thresholds open eligible evidence. Platform mechanics appear with relevant evidence and missing-data labels. No inspection changes the main view or its scroll position.
- Drawer is 420px alongside the canvas when at least 640px remains (including a 16px gap); otherwise it is a modal sheet. Close, Escape, focus restoration, modal focus containment, filter/view invalidation and no nested overlays are required.
- Preserve existing grouping, cutoff, coverage and denominator rules and Gemini optimizations. Validate reducer transitions, scope invalidation, bucket reconciliation and existing maths with tests; typecheck and build. No browser/screenshot automation or live ingestion in this iteration.

- Date-label refinement: show a compact localized month/day range in the header (include year for historical years). Keep exact selected dates, comparison dates and matching cutoff accessible through the existing icon Hint component instead of a permanent second line.

- Independent clock: the telemetry header SHALL include a reusable local-time clock showing HH:mm:ss and updating from system time every second. It owns its timer, cleans up on unmount, refreshes on visibility restoration, and does not drive filter state or preview calculations. Use semantic time markup without per-second screen-reader announcements. Keep the historical observation cutoff separately labeled beside comparison dates.

- Shell density refinement: compact page title and reusable filters share a wrapping header; selected dates, comparison dates and partial cutoff appear together. Metrics form a compact readout strip, followed by a single unboxed analysis-navigation row. Remove the enclosing toolbar card and reduce repeated chart-row framing/spacing without removing values, hints, platform colors, multi-select, export or drill-downs. Preserve readable narrow layouts. Browser verification is omitted at the user's request.

- Patterns SHALL lead with the five largest selected session contributions (ranked bars and cumulative share), 5/15/30-minute return rates (counts and eligible denominators), and recurring windows ranked by total active time. Each exposes contributing sessions. Existing trajectory, platform comparison and simulated mechanics move into collapsed Period details; Sessions and Viewing remain available.
- Return pairs SHALL be constructed from unfiltered parent sessions. Overview uses the next global session; platform pages use the next global session involving that platform. Display filters choose originating sessions, never hide subsequent returns. Eligibility requires uninterrupted declared observation coverage from the parent session end through the full threshold; insufficient coverage produces unavailable, not zero. Gap durations use parent session boundaries.
- Recurring-window shares SHALL use selected active time on completed observed days only, matching the numerator; frequency thresholds remain >=3 days and >=30%. Concentration SHALL use all selected active time, with filtered sessions explicitly labeled contributions.
- Keep controlled TelemetryFilters in the compact page header, separate from the analysis-navigation row. Replace native daypart select with an accessible checkbox multi-select popover, visible selection, reset, Escape/outside dismissal and focus restoration. Retain labeled compact controls at narrow widths. Selected dayparts combine with OR; all selected means All day, none yields empty results. Apply selection consistently to summaries, comparisons, charts and exports.
- Patterns SHALL use a compact overview without inner tabs: session contributions and recurring windows alongside each other at wide widths, with a compact return-rate row. Show the top three recurring windows initially with an inline expansion for the rest. Preserve chart drill-downs and collapsed Period details; narrow layouts stack naturally.
- Strengthen telemetry-only surface/control contrast; preserve platform hue mapping but use neutral labels plus colored markers. Viewing curves also use distinct line patterns and labeled keys.
- Preview data SHALL carry explicit coverage intervals. Production integration must resolve start/end versus flush timestamp semantics before adopting these adapters. Popup, production wiring, stop-loss, AI and tab tracking are outside this refinement.

These criteria supersede conflicting R7 lens, score and calibration requirements for the mock preview. Production data wiring remains deferred.

1. Navigation SHALL provide Overview, YouTube, Instagram and Facebook pages, each with Patterns (default), Sessions and Viewing tabs. Shared Day/7d/30d navigation and daypart filtering apply consistently to all summaries, comparisons, charts and exported rollups. Platform page state is retained when navigating away.
   - The sidebar SHALL toggle between expanded labels and a 72px desktop icon rail, preserving page/filter/chart state. The toggle and navigation retain accessible names, keyboard focus and hover titles. Narrow screens retain a compact horizontal icon navigation. Collapse state lasts for the current tab session only; charts resize without remounting.
2. Preview observations SHALL be stable per calendar date, include explicit end timestamps, and drive every aggregate. A visible simulated-data label and cutoff are required. Equal-length comparison windows use matching final-day cutoffs. Days advance by local calendar arithmetic.
3. Patterns SHALL show active-time/reel trajectories with prior-period references, platform attribution on Overview, and recurring time intervals instead of a multi-day heatmap. Recurrence uses 30-minute start-time bins on completed observed days, qualifying at >=3 days and >=30% of eligible days. Adjacent bins merge; display union-day frequency and median active time on matching days. Midnight is an explicit boundary. Clicking an interval reveals contributing sessions.
4. Sessions SHALL be grouped before platform/daypart filtering, using gaps <=60 seconds against the latest explicit observation end. Daily timelines show platform intervals and gaps with exact active time, span, count and skips on hover/focus. A scatter toggle uses active minutes, skip percentage and reel count as size, with selection opening the corresponding timeline. Parent session identity survives filtering.
5. Viewing SHALL show an empirical percentage-watched-at-least-duration curve over the full observed range, sample counts, median and average. This is observed active viewing duration, not inferred abandonment or a diagnosis. No Compulsion, Fano, Lock-in, Attention ROI or calibration claims are displayed.
6. Platform mechanics modules SHALL use optional simulated entry route, explicit replay count and measured comment-open duration. Their measured denominators and missing coverage must be visible; unavailable data never becomes zero. Platform differences arise from observations, not psychological stereotypes.
7. Preserve the dark instrument visual system, platform colors, urgency for increased measures, interactive tooltips and icon hints. Keep the popup unchanged. Keyboard controls, empty filters, narrow desktop windows and chart details must work.
8. Regression tests SHALL cover reconciliation, overlapping date stability, cutoff matching, 60-second boundaries, overlaps, overnight sessions, recurrence and missing measurements. Typecheck and build must pass. Preview export is a minified array of filtered rollups; R8 production all-history export remains deferred.

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

Calendar visual correction supersedes separated date tiles: use one continuous seven-column grid with shared one-pixel rules, a weekday header row, square unboxed date cells and complete leading/trailing blanks for monthly ranges. Dates lead; measurements are secondary. Weekdays appear in the header for both modes; retain seven columns on small screens with contained horizontal scrolling rather than a four-column wrap. Selected date uses an inset outline and restrained tint. Preserve date selection, coverage and metric calculations.

### Shared UI states revision
- Implement shared static Skeleton, StateRegion, regional render-error boundary and typed empty reasons. Loading is aria-busy with one announcement; empty/error states retain region geometry and have concise recovery actions. Zero measurements remain zero; unknown ratios remain unavailable. Navigation, filters, Back and Close stay outside replaceable data regions.
- In-place development-only States controls select whole surface or a mounted region and Normal/Loading/Empty/Error. Whole-surface overrides win; Reset clears overrides, targeted Retry restores normal. Empty reasons are restricted by target. Remove popup brand-click cycling. No fake network waits or persistence.
- Active region inventory: popup headline metrics, donut/platform list, Signals quick skips/distribution/average, hourly summary/chart, platform detail metrics/abandonment/hourly; telemetry headline metrics, Returns, windows/trends/sessions/viewing canvas, evidence summary, date calendar, selected-day inspector, interval timeline, return pairs, selected session, mechanics, duration curve, records viewport; Settings configuration. Shared retained AnalysisPanel callers inherit state handling, without introducing navigation to unused pages.
- Data presets for development previews: normal, observed zero, no filter matches, insufficient history/coverage and previous-period-only data. Production uses existing mock data unchanged. Empty messages distinguish no activity, filters, insufficient history/follow-up, unobserved and unavailable session. Filter recovery changes relevant filters only. Settings keeps defaults and validation; its empty preview offers restoration of mock defaults without implying storage.
- Validate state precedence/reset, errors/retry, skeleton accessibility, geometry classes, empty semantics, preset data, region isolation and full builds. No browser automation or new dependencies.

### Shared dark/light visual system
- Replace dark-only overrides with document-root semantic themes. System/Light/Dark preference defaults to System; popup and telemetry share persisted preference via minimal background messages and IndexedDB preferences store. No new permissions, storage APIs or network access. Preserve existing stores through additive upgrades. Resolve preference before rendering app content; bounded startup failures use System. Save errors keep the local choice usable and expose retry; successful changes notify open surfaces. System follows device changes.
- Palette roles (dark/light): page #10151c/#edf1f5, panel #202a36/#ffffff, raised #2d3a4a/#e2e8f0, main text #edf1f7/#17212d, secondary #b7c2cf/#46556a, muted #a5b2c2/#526277, control boundary #8293a8/#778494, interaction #89b4ff/#2458a6. Preserve platform hue identities; light chart coral #b74025, violet #7732b4, cyan #006e86. Light increase #8a5700, decrease #087064, comparison #805e00, urgent #b42338; retain bright dark chart/semantic colors.
- Neutral structural panels, distinct control boundaries, quieter separators. Remove decorative colored card surfaces and glowing hints; passive metrics do not behave visually like buttons. Retain platform chart colors, amber/teal direction, gold previous series, icon hints and existing interactions. Centralize chart tokens with CSS roles, including tooltips and gradients.
- Correct broad font/table/margin overrides. Preserve full-width left-aligned shell, popup geometry and top table pagination. At >=1040px Settings content width, configuration and existing summary/preview sit side by side; stack below. Theme setting is real, stop-loss remains unsaved mock.
- Validate palette text >=4.5:1 and essential boundaries/focus >=3:1 against actual surfaces; storage, System changes, cross-window notifications, startup/save failures, CSS cascade, charts and state components. No skills, browser automation or dependencies; document manual visual acceptance separately.

### Live collection and recovery revision
This revision supersedes R1–5 flush-only ingestion and start-only time attribution. All three platform adapters share one visit tracker. A visit begins on a focused, visible reel encounter; automatic loops retain identity, leaving and returning creates a new ID. Active intervals require the active tab of the focused window, >=50% video visibility, playing and non-buffering media. Monotonic elapsed measurement excludes sleep/scheduling gaps. Save start, state changes, and cumulative snapshots every two active seconds; revisioned transactional upserts and commit acknowledgments make retries idempotent. Retain pending updates until acknowledged; report failed saving. Recover abandoned visits at their last observation with interrupted status; reconcile surviving collectors after worker restart. No shutdown callback or two-second absolute loss guarantee.

Store real visit metadata and active intervals in additive IndexedDB stores, preserving preferences and any legacy stores. Background alone reads/writes storage and validates sender/record ownership. Query the same observations for popup and telemetry, include in-progress counts/time, classify quick skips only for completed visits. Split time at hour/day boundaries while counting a visit on its start day. Coverage records observed healthy tracking intervals, not assumed complete days; incomplete history must not qualify return follow-up or recurring windows. Unknown mechanics stay unavailable. Rollups are rebuildable, refreshed from observations on reads and after dirty writes; alarms only optimize recovery. Fixtures remain development-only. Test timing, adapters, retries, transactions, restart recovery, focus, sleep, midnight, query reconciliation and errors; manual real-feed checks remain explicitly pending without browser automation.
