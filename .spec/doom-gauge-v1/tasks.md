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
- **No premature color-coding**: neutral `DELTA`, no red/green thresholds until 7-day baseline.
- Metric formulas: burn `totalActiveMin/elapsedMinSinceMidnight*100` (`CALIBRATING (<30m)` guard); `avgFlick = totalActiveMs/(count*1000)` s; `of10 = round(skip/count*10)`; early-exit measured-only (`videoDurationMs != null`).
- `Longest Vortex` (gap ≤ 60 s sessionization) deferred — needs raw event inference.

## Tasks

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
