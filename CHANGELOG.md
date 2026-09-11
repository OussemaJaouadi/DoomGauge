# Changelog (tl;dr)

> Append-only. One entry per iteration: date + commit subject + what changed.

## 2026-09-11 — 💡 feat: popup telemetry interactions, bucket contracts SSOT, and domain types

### Code Behavior & Architecture Changes:
- **Interval Contract Change**: Purged mathematical interval strings (`3–<10s`, `10–<30s`, `1–<3m`, `≥20m`, etc.) in favor of clean telemetry intervals (`3–10s`, `10–30s`, `1–3m`, `>20m`, etc.) across viewing and session distributions.
- **SSOT Centralization (DRY)**: Unified `DURATION_BUCKETS` and `SESSION_BUCKETS` in `src/types/telemetry.ts` with typed specs (`DurationBucketSpec`, `SessionBucketSpec`), eliminating duplicated bucket definitions across `popupActivity.ts` and `telemetryWorkspace.ts`.
- **Engine Config Relocation**: Moved `SESSION_BREAK_MS` (60s session gap threshold) from `utils/popupActivity.ts` into `src/config/tracking.ts` alongside other engine thresholds.
- **Domain Types Promotion**: Promoted `TemporalVortex`, `TemporalDaySummary`, `TemporalInsights`, and `ViewingDistribution` to first-class domain types in `src/types/popup.ts`; moved `Evidence`, `ReturnRate`, `SessionReturn`, `RecordFilters`, and `RecordSort` to `src/types/telemetryPreview.ts`.
- **Runtime Alignment**: `summarizeViewingDistribution()` now builds dynamically from canonical `DURATION_BUCKETS`.
- **Engineering Standards & Import Hygiene**: Codified `docs/STANDARDS.md`. Standardized import hierarchies across all chart, dashboard, telemetry, settings, and entrypoint modules into human-readable annotated trees; purged loose types from utils and unbraced one-liners.

### UI & Telemetry Interactions:
- Signals tab: restructured into a 3-panel behavioral telemetry instrument (Flick Cadence differential gauge, Attention Depth stacked distribution with dynamic 6px edge-guarded floating tooltip, and Impatience platform rack).
- PlatformDetail: transformed platform metrics into an open two-tier telemetry strip (bold hero volume + inline behavioral signals) and added twin amber filmstrip visualizer for early exit (<50%).
- Tactile telemetry micro-animations across KPI cards (fluid clock, clicker snap, zap spark, cadence pulse, Worst Vortex crimson pulse).
- GPU-composited `scaleX` transitions on platform bars (zero layout thrashing).
- Live natural clock and comparison hint in header; purged "vs yesterday" copy.
- Platform share hint in Donut header and elevated share pills in platform rows.
- Purged legacy prototype components and inline color overrides.

## 2026-09-05 — 🐛 fix: 7 telemetry defects (collapse, traversal, dates, matrix, tokens, badge, colors)
- Collapse spill: hidden rows on collapsed rail; traversal clamps to today
- NeuroMap date keys via tested `localDateKey`; circadian matrix live from filtered events
- Survival SVG hex fill + shared tooltip; `badge-success` green calibrated
- Freeze slate `#64748b` (no more FB-cyan collision); KpiCard `threat` accent, telemetry acute only
- Tests: 27 pass (date-key, matrix reactivity); typecheck + build green

## 2026-09-05 — ✨ ui: telemetry finish pass (one product, one dialect)
- Shared chart theme (`chartTheme`: grid/ticks/square dots) + single `ui/ChartTooltip`; all 7 tooltips converged
- Single `platformMeta` module (PlatformRow + HourlyBars deduped)
- Chrome densified: segmented TopBar wells, 240px rack sidebar, instrument headers (`01 // LENS`), terse-caps copy everywhere
- Badge amber calibrating/green calibrated; stale reds → `threat-red`; tabular numbers on all readouts
- Mirror discipline note (tokens.ts ↔ global.css ↔ DESIGN.md)

## 2026-09-05 — 💡 feat: Surface B command center (5 lenses, deterministic fixtures)
- R7 amended: control plane + 5 lens ACs; AC8 ROI measured-only guard
- Deterministic fixtures (`seededRandom`, rollups + events + hourly, crafted runaway cluster); `TimeRange` → `day | 7d | 30d`
- Shell: 5-lens sidebar w/ platform + daypart toggles, traversal header w/ slice + TOTAL DRAINED, minified rollup export (local date), CLOSE
- Lenses: MacroTrajectory, CircadianClock, SurvivalCurves (KM), SessionGravity (Fano + runaways), NeuroMap (quantiles + Compulsion + ROI + badges)
- Shared `platformMeta` module (DRY); `splitSessions`/`sessionStats` in `utils/telemetry.ts`
- Tests: `telemetry.test.ts` (14 pass); build green (popup + telemetry entries)

## 2026-09-05 — ✨ ui: harden popup telemetry + centralize tokens/types/mock
- Recharts locked in (`UPlotChart.tsx` deleted); Donut/Hourly/Sparkline/StackedBar on Recharts
- Types centralized (`types/models.ts`, `types/popup.ts`); helpers DRY (`utils/time.ts`, `utils/metrics.ts`: burn guard, dual-delta, avgFlick, of10, measured-only early-exit, `skipDiagnostics`)
- Mock centralized (`data/mock.ts` + `yesterdayMs`, measured early-exit strings)
- Components granularized (scoped PlatformDetail w/ Reels/Wave toggles + merged Abandonment card; Signals 3rd Avg Flick card; data-driven SignalsImpatience; TrendsTab 24h view)
- Tokens split: YT coral `#ff6b4a` vs `threat-red #ff2a3b` + `amber #ffd700`; tokens moved to `components/tokens.ts`
- Popup: DRAINED burn + `CALIBRATING (<30m)` guard, VS YDAY dual-delta on threat-scale, PEAK CHANNEL, globals hidden in scoped view, 28px telemetry dock, zero abbreviations
- Specs: R6.2/R6.4/R6.5 v2-hardened + `tasks.md` mock-phase guardrails
- Tests: `src/__tests__/metrics.test.ts` (9 pass)
