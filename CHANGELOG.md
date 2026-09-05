# Changelog (tl;dr)

> Append-only. One entry per iteration: date + commit subject + what changed.

## 2026-09-05 — ✨ ui: harden popup telemetry + centralize tokens/types/mock
- Recharts locked in (`UPlotChart.tsx` deleted); Donut/Hourly/Sparkline/StackedBar on Recharts
- Types centralized (`types/models.ts`, `types/popup.ts`); helpers DRY (`utils/time.ts`, `utils/metrics.ts`: burn guard, dual-delta, avgFlick, of10, measured-only early-exit, `skipDiagnostics`)
- Mock centralized (`data/mock.ts` + `yesterdayMs`, measured early-exit strings)
- Components granularized (scoped PlatformDetail w/ Reels/Wave toggles + merged Abandonment card; Signals 3rd Avg Flick card; data-driven SignalsImpatience; TrendsTab 24h view)
- Tokens split: YT coral `#ff6b4a` vs `threat-red #ff2a3b` + `amber #ffd700`; tokens moved to `components/tokens.ts`
- Popup: DRAINED burn + `CALIBRATING (<30m)` guard, VS YDAY dual-delta on threat-scale, PEAK CHANNEL, globals hidden in scoped view, 28px telemetry dock, zero abbreviations
- Specs: R6.2/R6.4/R6.5 v2-hardened + `tasks.md` mock-phase guardrails
- Tests: `src/__tests__/metrics.test.ts` (9 pass)
