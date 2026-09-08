# Tasks: DoomGauge v1 — UI-mock phase (v2 hardened)

## Approved Surface B rebuild

- [x] Stable observation source, matching period cutoffs and pure derived adapters.
- [x] Overview/platform navigation, Patterns trajectories and recurring intervals.
- [x] Session timelines/scatter and empirical Viewing curves.
- [x] Simulated mechanics coverage, export, empty states and keyboard support.
- [x] Regression tests, typecheck, build and bounded visual review.

Validation (2026-09-07): 72 tests pass, including 18 new preview regression cases; typecheck and production build pass. Headless Chrome exercised all 36 page/range/tab combinations, 760px and 390px widths, daypart filtering, session and interval drill-down, saved per-page state, and export reconciliation (YouTube export: 653 reels, matching the displayed count). No runtime exceptions or horizontal overflow. Hint keyboard activation and Escape dismissal passed a targeted check with corrected native Enter events. Two screenshot review rounds verified the final desktop and narrow layouts. React Doctor's full scan reports no errors; non-blocking chart-loading and code-organization advisories remain. Build retains the existing >500kB shared-chart chunk warning. This is a built local preview test, not live extension tracking. Legacy unused lens components/math remain for reference; the active telemetry route uses the new preview adapters.

> **Phase:** `UI-mock only` — no real data until UI is approved.
> **SSOT:** `spec.md` + `design.md`. This file is the task tracker + agent guardrails.

## Agent rules (do not re-flag while phase=mock)

- Direct `import { MOCK } from data/mock` in UI is **intentional**. Do NOT raise Option-A / real-data violations.
- `popup/index.ts` dead file is **intentional** (WXT uses `main.tsx` + `index.html`). Delete on real-data phase.
- Brand-click `toggleState` (success/empty/error) is an **intentional dev switch**. Delete on real-data phase.
- Popup size is **decided: 540x580**. Do NOT cite old `400x540` cap.
- `PlatformDetail` drill-down is **in scope** (Requirement 6 AC4).
- Headline metric is **`DRAINED`** (`LOST` retired everywhere).
- **Threat-scale (locked):** burn sub + worse deltas render in `threat-red #ff2a3b`, better deltas in `accent-green`; neutral `· DELTA` suffix stays. YT channel color is coral `#ff6b4a` — never reuse threat-red for the channel.
- Signals tab has **3 KPI cards** (Velocity + Impatience + Avg Flick).
- **Zero abbreviations**: icon + full platform name only, including hourly tooltips/legends.
- **Threat-scale is live** (line above); the old neutral-only rule is retired. Lens-5 quantiles stay behind the amber `[v0 HEURISTIC // CALIBRATING]` badge until the 7-day baseline.
- Metric formulas: burn `totalActiveMin/elapsedMinSinceMidnight*100` (`CALIBRATING (<30m)` guard); `avgFlick = totalActiveMs/(count*1000)` s; `of10 = round(skip/count*10)`; early-exit measured-only (`videoDurationMs != null`).
- `Longest Vortex` (gap ≤ 60 s sessionization) deferred — needs raw event inference.

## Tasks

### Approved popup facts and activity revision

This revision supersedes conflicting locked popup labels/formulas above. Mock session extraction is now in scope; real-data sessionization remains deferred.

- [x] Derive all popup fixtures from timestamped today/yesterday views and test session boundaries, overlap, pauses, cutoff and reconciliation.
- [x] Retain Hourly visual 24h histogram chart paired with non-redundant Worst Vortex, Dissociative Gap, and focus valley insights.
- [x] Extract reusable streaming helpers (appendViewToSessions, updateHourlyBuckets, deriveTemporalInsights) out of popupMock.ts.
- [x] Clean dead code from peaks.ts (findLocalMaxima, get4hIntervals, findPeakRanges).
- [x] Restore Donut hover tooltips with platform color, name, % share, and formatted metrics.
- [x] Redesign Hint component as accessible 22px colored icon button (amber/blue) with high-contrast popover.
- [x] Emphasize Quick-skips percentage badge and calm neutral OverviewCards.
- [x] Validate 49 tests pass across 3 files, typecheck, build, and all preview states.

Validation: 44 tests pass (15 new session/observation cases), typecheck and production build pass. Headless Chrome inspected 16 popup views/states including both share modes, all three details and scrolled charts, measurement disclosures, Activity and empty/error. Checks found no horizontal overflow, text below the supporting-size/contrast floor, external requests or page errors; focus restoration, keyboard tabs and pinned footer passed. This was the built popup served locally with the Chrome tab-opening API stubbed, not a live tracking test. React Doctor had no errors; eager chart imports and pre-existing shared-component advisories remain. Build retains its shared-chart chunk-size warning. Impeccable's three type-scale advisories are documented in the popup design addendum.

### Active popup clarity revision

The R6 September 2026 clarity revision supersedes older locked popup formulas/cards below; DRAINED remains with an explicit Active time label. No Surface B changes.

- [x] Promote active time/count with same-cutoff comparisons; remove burn/Peak Channel.
- [x] Unify popup fixtures and Time/Count graphics; simplify Signals, Hourly and platform detail.
- [x] Improve scoped readability, keyboard states, fixed-size layout and empty/error copy.
- [x] Validate fixture consistency, tests, typecheck, build and all popup preview views.

- [x] Popup mock shell (Today/Signals/Trends tabs + Donut + rows + footer)
- [x] Decide size 540x580 (spec + design + docs updated)
- [x] Decide header: DRAINED / VS YDAY dual-delta / PEAK CHANNEL (spec R6.2 updated)
- [x] Decide drill-down: scoped PlatformDetail, globals hidden, abandonment merged (spec R6.4 updated)
- [x] Fix Donut + row labels to icon + full name
- [x] A11y: brand toggle + footer as `<button>`
- [x] Remove unused `Platform` import
- [x] Phase 1: hide globals in detail, slim 28px dock, HourlyBars abbrev purge, abandonment merge + scroll fallback
- [x] Phase 2: DRAINED burn guard, VS YDAY dual delta (+`yesterdayMs` mock), avgFlick/early-exit utils + `src/__tests__/metrics.test.ts`
- [ ] Real-data phase (later): wire `get_today_stats`/`get_rollups` via SW, remove MOCK import, remove toggleState, delete `index.ts`
- [ ] Phase 4 (post-baseline): Vortex sessionization + threshold calibration after 7 days real data

## Retained files — future purpose (do NOT delete, do NOT flag as dead)

| File | Future use | Spec ref |
|------|-----------|----------|
| `dashboard/DopamineVelocity.tsx` | Donor: step-line duration chart → Frustration Gradient viz | R7 AC6 ext |
| `dashboard/MacroOverview.tsx` | Donor: KPI trio layout → canvas header/debt summary | R7 AC4 ext |
| `dashboard/PlatformAttribution.tsx` | Donor: per-platform cards → benchmark grid variant (real-data) | R7 AC4 ext |
| `dashboard/DoomScore.tsx` | Retired label; kept until owner calls deletion | — |
| `charts/Sparkline.tsx` | 7d trend candidate (Trends tab / Macro lens) | R6 AC6 / R7 |
| `charts/StackedBar.tsx` | Share-visual alternative if Donut toggle outgrows | R6 AC4 |
| `ui/Tooltip.tsx` (hover) | Rack/legend explanatory hovers | — |
| `ui/Card.tsx` | Generic panel if a lens needs it | — |
| `ui/Badge.tsx` | Live: calibration + DELTA pills | R6/R7 |

Resolved collision: the old positioned `ChartTooltip` export in `ui/Tooltip.tsx`
was removed as superseded by `ui/ChartTooltip.tsx` (single home, 7 call sites).

## Surface B — telemetry build (mock-first, dependency order)

- [x] Fixtures: deterministic `TELEMETRY_FIXTURE` in `data/mock.ts` (seeded events + sessions + rollups; kill `Math.random()`); `TimeRange` rename to `day | 7d | 30d`
- [x] Phase 1 shell: 5-lens sidebar (toggles for platforms + dayparts), traversal header, minified rollup export w/ local-date filename, `✕ CLOSE`
- [x] Lens 1 Macro Trajectory (rollups → ComposedChart + benchmark grid)
- [x] Lens 2 Circadian Clock (hourly bins → 24h × daypart matrix, Graveyard threat highlight)
- [x] Lens 3 Survival Curves (durations → KM $S(t)$, $t_{cliff}$, $t_{lock}$)
- [x] Lens 4 Session Gravity (gaps → Fano factor + cold-start runaways $\ge 45\text{m}$ idle / $>15\text{m}$)
- [x] Lens 5 Neuro Map (quantiles + Compulsion Index + Attention ROI measured-only + calibration badges)
- [x] Tests for each lens pure fn in `src/__tests__/`; CHANGELOG entry + commit

## Analysis workspace replacement

- [x] Replace telemetry tabs/card routes with a view selector and main canvas; preserve platform state and filters.
- [x] Implement window/day, ranked session, trend and duration-bucket inspection in a responsive evidence drawer with Back/Close.
- [x] Preserve exact duration curves, return coverage, observed mechanics and platform context in evidence.
- [x] Validate reducer navigation/scope invalidation, bucket boundaries/reconciliation and window/hour selection with unit tests; typecheck/build.
- [ ] User visual/interaction acceptance: browser automation omitted as requested; keyboard/focus behavior implemented but not browser-verified.

Visual evidence refinement: implemented wide modal, larger readouts, bounded main canvas, date lanes, local highlight/records Back, return pairs and icon hints. Unit tests cover date grouping, clipping, overnight totals and detail transitions. Browser/visual acceptance remains manual as requested.

OverviewCard reuse refinement: implemented four top cards, Returns in every view, one visible choice row and left alignment. Return selection uses the same workspace reducer and rate results as evidence. Added all-view return action regression coverage; visual/browser acceptance remains manual.

Clarity revision complete in code: semantic card accents, standalone Returns, fixed portal hints, clearer trend lines and session-duration buckets. Validation: 96 tests pass; typecheck/build pass; React Doctor reports no errors. Added tests for bucket boundaries/reconciliation, filtered overnight sessions, viewport placement and Escape consumption. New color contrast calculated against four actual surface colors (minimum 5.50:1). Browser layering/visual acceptance remains manual as requested.
Scannable-hint revision complete in code: gold previous-period series; audited and migrated popup, telemetry and retained Hint callers to labeled facts. Validation: 99 tests pass, typecheck/build pass. Rendering tests cover plain-text compatibility/escaping, date/cutoff rows, zero coverage and unavailable values; existing geometry/Escape tests pass. Gold contrast is at least 7.58:1 against the four app surfaces. Browser appearance and interaction acceptance remain manual as requested.

Reel-record table refinement implemented: extraction, filters, stable sortable columns, 25/50/100 pagination, sticky headers and empty results. Validation: 103 tests pass; typecheck/build pass. Tests cover 3,001-row pagination, shrinking/empty results, local date and <3s boundaries, combined platform filters, active-versus-elapsed sorting, nonmutation and a 25-row initial render for 3,000 records. Layout detector reports no findings. Visual/keyboard interaction acceptance remains manual; no browser automation used.

Calendar evidence refinement implemented: multi-day window/bucket calendar, one selected day timeline, visible session reel counts, automatic latest-day/largest-contribution selection and records Back restoration. Validation: 109 tests pass; typecheck/build pass. Coverage includes observed zero/missing/partial dates, local year-boundary overnight attribution, window-filtered contributions, default tie-breaking, date/session transitions and 7-/30-day rendering with exactly one day timeline. Browser appearance and keyboard interaction acceptance remain manual as requested.

Settings foundation implemented: bottom gear navigation, isolated minimal page and notice/style removal. Analysis selection state stays in App; conditional workspace unmount closes evidence. Static inspection confirms collapsed labels retain accessible names, shared active/focus styles and responsive footer navigation. Validation: 109 tests pass; typecheck/build pass; React Doctor reports no errors. Visual/interaction acceptance remains manual; no browser automation used.

Settings stop-loss mock implemented with ephemeral daily/session, platform and threshold controls, validation and inline preview. Validation: 110 tests pass, including numeric boundary checks; typecheck/build pass. Interactive browser acceptance remains manual as requested. No persistence or enforcement is implemented.
