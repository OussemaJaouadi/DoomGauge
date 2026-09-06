# Tasks: DoomGauge v1 — UI-mock phase (v2 hardened)

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
