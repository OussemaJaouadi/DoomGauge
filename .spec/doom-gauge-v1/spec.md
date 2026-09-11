# v1 requirements

- **Active contract:** personal, local, analysis-only.

## R1–R3 · Collection

| ID | Platform | Scope |
| --- | --- | --- |
| R1 | YouTube | Shorts routes and identified Shorts videos |
| R2 | Instagram | Reel routes and identified reel containers |
| R3 | Facebook | Reel routes and identified reel containers |

### Shared acceptance criteria

- Detect SPA navigation, video replacement and visibility changes without reload.
- One ID per viewing visit; loops retain identity, leave/return starts another.
- Count focused visible encounters, including zero-time impressions.
- Active time requires **all** conditions:

| Gate | Required |
| --- | --- |
| Window/tab | Focused window; active tab |
| Visibility | Visible document; ≥50% video visible |
| Playback | Playing; no buffering or seeking |

- Media events pause promptly; normal monotonic sampling interval ≤500ms.
- Scheduling gaps and clock discontinuities add no inferred viewing time.
- Optional reel identity/video length; no full URL, query parameters or page text.

## R4 · Saving and recovery

- Background alone accesses IndexedDB; validate sender, main frame and ownership.
- Save start, state changes and approximately two-second foreground checkpoints.
- Stable IDs, cumulative intervals and increasing revisions make retries idempotent.
- Acknowledge only committed transactions; reject historical interval rewrites.
- Retain pending snapshots while the collector survives; expose saving failures.
- Probe surviving collectors at startup/maintenance.
- After recovery grace: mark abandoned visits interrupted at their last observation.
- Additive upgrades preserve stores. Never count browser downtime.
- Forced closure may lose unsaved tails.

## R5 · Measurements

- Sum recorded intervals; split active time at local hour/day boundaries.
- Count a visit at its start; time contributions do not create extra counts.
- Quick skip: completed visit **<3000ms**.
- Skip-rate denominator: completed visits only.
- Group sessions before filtering: gaps **≤60s** join against the latest end.
- Apply platform/date/OR-combined dayparts consistently.
- Compare equal-length periods at matching final-day cutoffs, with sufficient coverage.
- Returns: **5 / 15 / 30 minutes**; require full follow-up coverage.
- Return filters: select origins; keep all return targets.
- Recurrence: **≥3 eligible days**, **≥30% frequency**, **30-minute** start bins.
- Merge adjacent recurrence bins; never cross midnight.
- Missing coverage/mechanics are unavailable, not zero. Summaries are rebuildable.

## R6 · Popup

- **540 × 580**; Active time and Reels lead; telemetry action stays visible.
- Today: interactive time/count donut, platform shares and drill-down.
- Signals: completed quick skips, average/median and duration distribution.
- Hourly: histogram and session context.
- Preserve hover, keyboard access, icon hints and platform identities.
- Initial local render: target **300ms** on a modern machine; verify by measurement.

## R7 · Telemetry

- Overview plus platform pages; retain each page's selections.
- Visible Time windows / Trends / Sessions / Viewing; Day / 7d / 30d ranges.
- Full-width left alignment; collapsible sidebar.
- Sessions: duration histogram. Trends: distinguish previous lines and unknown buckets.
- Wide evidence dialog: focus containment, Escape/Close and opener focus restoration.
- Multi-day evidence: seven-column calendar, one selected-day timeline and session details.
- Records: pagination on top; **10 / 25 / 50** rows; default **10**.
- Filter: platform/date/quick skips. Sort: start/active/elapsed.
- Apply filters and sorting before pagination.
- Show visit status. Back retains date/session selection.
- No clinical scores; optional mechanics require measured denominators.

## R8 · Export

- Selected-scope rollups as minified JSON; empty selection gives `[]`.
- Filename: `doomgauge-export-YYYY-MM-DD.json`; no network request.
- All-history rollup export remains pending. Raw backup/restore is future work.

## R9 · Privacy

- Actual permissions: `alarms`, `tabs`; three supported `www.` hosts.
- Profile IndexedDB only; no accounts, server, analytics requests, cookies, localStorage or chrome.storage.
- Dev-server traffic is tooling, not product telemetry.

## R10 · Appearance/settings

- Save shared **System / Light / Dark**; System follows OS changes.
- Resolve theme before content; bounded failures → System.
- Failed save: retain local choice; offer Retry.
- Semantic colors; text ≥4.5:1 and essential control/focus contrast ≥3:1.
- Stop-loss editor remains an unsaved, unenforced mock.

## R11 · Modes/loading

- Sole switch: `WXT_DATA_MODE`; unset → actual; reject invalid values.

| Mode | Data | State previews | Activity collection/ingestion/maintenance |
| --- | --- | --- | --- |
| `dev` | Fixtures | Shown | Off |
| `actual` | Local records | Hidden | On |

- Build-server mode and URLs cannot select the data source.
- Mode changes preserve history; themes work in both modes.
- Queries read the selected range; no summary rebuild or storage clearing.
- Coalesce concurrent reads.
- Refresh/failure: retain loaded data and mounted controls.
- Empty query: success. Initial load: regional skeletons.
- Query errors: one notice, one Retry.
- Preview/reset never deletes browser data.
- Failed operations retain local diagnostic causes and return typed failure codes.
- Suppress only expected missing recipients; surface theme fallback and tracking failures.
- Export requires a successful read; cached exports retain the stale-data notice.
- Refactors preserve timing, revision, storage and measurement contracts.
- Shared types live in `src/types`; reusable helpers in `src/utils`; tracking modules own runtime orchestration.
- Each region declares ready/loading/empty/unavailable/error from its own dependencies.
- Zero totals remain valid; missing denominators and follow-up remain unavailable per metric.
- Calculation failures stay inside regional boundaries; retry only the failed computation.
- Shared read errors use one Retry; region labels distinguish failure from missing observations.

[Design](design.md) · [Validation](tasks.md)
