# Visual rules

## Layout

- Popup: **540 × 580**; pinned telemetry action; scroll the content.
- Telemetry: full available width, left aligned; collapsible sidebar.
- Keep Time windows / Trends / Sessions / Viewing visible as buttons.
- Evidence: wide dialog; Back preserves the selected date/session.
- Records: top pagination **10 / 25 / 50**; filter/sort before pagination.
- Calendar: one seven-column grid; week strip or weekday-aligned month.
- Settings: editor beside preview at **1040px content width**; stack below.

## Color

- Palette: [theme/palette.ts](../src/theme/palette.ts); shared with charts.

| Role | Meaning |
| --- | --- |
| Neutral page / panel / raised | Structure |
| Blue | Interaction and aggregate charts |
| Coral / violet / cyan | YouTube / Instagram / Facebook |
| Amber / teal | Usage increased / decreased |
| Gold, dashed | Previous period |
| Red | Explicit urgent states |

- No decorative glow or passive-card hover.
- Reinforce color with labels, position or line style.

## Interaction and states

- Preserve donut hover, keyboard access and icon hints.
- Hints: short labeled facts, one optional note; clamp to viewport.
- Unknown ratios: **—**.
- Theme/contrast: [R10](../.spec/doom-gauge-v1/spec.md#r10--appearancesettings).
- Loading/empty/error: [R11](../.spec/doom-gauge-v1/spec.md#r11--modesloading).

[Cognitive preferences](PSYCHOLOGY.md) · [Requirements](../.spec/doom-gauge-v1/spec.md)
