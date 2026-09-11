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

## Acceptance still required

- [ ] Logged-in feeds: navigation, rapid scrolling, loops, buffering on all platforms.
- [ ] Focus changes, browser close/reopen and forced worker restart.
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
