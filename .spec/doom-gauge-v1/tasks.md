# v1 status

[Requirements](spec.md) · [Implementation](design.md)

## Implemented

- [x] Three collectors; shared focused-playback tracker.
- [x] Revisioned checkpoints, commit acknowledgments and recovery.
- [x] Shared queries; interval-based time and start-based counts.
- [x] Popup, telemetry, calendar evidence and paginated records.
- [x] Shared themes and mock stop-loss editor.
- [x] Automated storage, timing, measurement and UI tests.

## Current follow-up

- [x] Build both modes; test env selection and preview-control gating.
- [x] Test scoped retry, retained data and regional skeletons.
- [x] Refactor tracking; test typed failures, pending retries and export gating.
- [x] Condense docs, check links and review Mermaid sources.
- [x] R12: repositories/services, shared connection, nonblocking theme and lifecycle recovery; 180 tests, typecheck, both builds.
- [x] R13: quiet operation, indexed reads, migration rollback/newer-version protection and reconnect handling; 195 tests, typecheck, both builds.
- [x] R1–R3: dedicated-viewer detection, qualifying playback and separate repeat visits; automated collector/detection regressions.
- [x] Player controls: SVG/transparent overlays and seven-video regression fixture; 199 tests, typecheck and actual build pass.

## Retained files — future purpose (do NOT delete, do NOT flag as dead)

| File | Future use |
|------|-----------|
| `dashboard/MacroOverview.tsx` | Donor: KPI trio layout → canvas header/debt summary |
| `dashboard/PlatformAttribution.tsx` | Donor: per-platform cards → benchmark grid at real-data phase |
| `charts/Sparkline.tsx` | 7d trend candidate |
| `charts/StackedBar.tsx` | Share-visual alternative if Donut toggle outgrows |
| `ui/Tooltip.tsx` (hover) | Rack/legend explanatory hovers |
| `ui/Card.tsx` | Generic panel if a lens needs it |

Gone, not retained: `DopamineVelocity.tsx`, `DoomScore.tsx` (deleted in `c669e1c`).
Resolved: the old positioned `ChartTooltip` export in `ui/Tooltip.tsx` was removed as superseded by `ui/ChartTooltip.tsx`.

## Acceptance still required

- [ ] Logged-in feeds: navigation, rapid scrolling, loops, buffering on all platforms.
- [ ] Verify messages/home feeds count zero; A → B → A counts three; confirm real viewer hit-testing on all platforms.
- [ ] Focus changes, browser close/reopen and forced worker restart.
- [ ] WXT reload: receiver availability, startup speed and theme read/save Retry.
- [ ] Real-history coverage/insight eligibility; popup latency target.
- [ ] Manual visual/accessibility checks in both themes.
- [ ] All-history rollup export.

- Automated checks do not replace manual acceptance.

```sh
bun run test
bun run typecheck
bun run build:dev
bun run build:actual
```
