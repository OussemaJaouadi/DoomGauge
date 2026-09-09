---
name: DoomGauge
description: Cognitive telemetry and neuro-spike doom-scroll tracker
colors:
  bg-root: "#090d13"
  bg-surface: "#0f141c"
  bg-surface-raised: "#161d28"
  border-subtle: "#1c2838"
  border-grid: "#16222f"
  text-primary: "#f0f6fc"
  text-secondary: "#8b949e"
  text-muted: "#545d68"
  accent-green: "#00ff88"
  accent-cyan: "#00b4d8"
  accent-magenta: "#ff0055"
  accent-amber: "#ffd700"
  accent-blue: "#4f80ff"
  threat-red: "#ff2a3b"
  platform-yt: "#ff6b4a"
  platform-ig: "#a855f7"
  platform-fb: "#00b4d8"
typography:
  display:
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Fira Code', monospace"
    fontSize: "2rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Fira Code', monospace"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.05em"
  body:
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Fira Code', monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Fira Code', monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  card-panel:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.bg-surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
---

# Design System: DoomGauge (Neuro-Spike Telemetry)

## Surface B rebuild refinement

Telemetry retains the platform palette and instrument chassis, with Overview/platform navigation and Patterns/Sessions/Viewing tabs. Surface B uses a 12px supporting-text floor, 14px body, 15px panel headings, 22px page headings and 22–32px numeric readouts. Its scoped secondary text is `#a8b3c2`; small worsening deltas use readable threat tint `#ff7882`, and interval hover uses cobalt tint `#8aaaff`. These tonal variants retain the existing semantic mapping. Chart data marks keep the original platform colors. The desktop rail becomes a labeled navigation grid at narrow widths; dates, hints and chart controls remain accessible. No global or popup token changes are part of this refinement.

## Overview
DoomGauge uses an EEG/Neuro-Spike Telemetry visual system designed specifically for ADHD attention awareness. Instead of bland corporate cards or gamified badges, it frames doom-scrolling as raw bio-telemetry: high-contrast dark plates, precise oscilloscope grids, and glowing frequency channels.

## Colors
- **Ground / Chassis**: Abyssal charcoal `#090d13` with subtle grid lines `#16222f`.
- **Text / Readouts**: Crisp high-contrast white `#f0f6fc` and muted slate `#8b949e`.
- **Telemetry Channels**:
  - **YouTube Shorts**: Warm coral-vermilion `#ff6b4a` — hue ~11°, warm and distinct from severity red
  - **Instagram Reels**: Violet-purple `#a855f7` — hue 270°, ~100° from YT for instant distinguish
  - **Facebook Reels**: Signal cyan `#00b4d8` — hue 192°, far from both
  - **Attention Pacing / Dwell**: Electric cobalt `#4f80ff` — hue 223°, sits in the open gap between FB cyan (192°) and IG violet (270°) with zero collision
  - **Global Status / Awareness**: Phosphor green `#00ff88` (recovery / drop), Hazard amber `#ffd700` (moderate / warn), Blood crimson `#ff2a3b` (threat / surge)

## Typography
Monospace-first across all metrics, timestamps, and headers. Numbers and telemetry values are strictly monospaced to prevent layout jitter during live count changes.

## Layout

### Surface A — Popup (glance)
- **Container**: Chrome popup (540 × 580 px fixed). Treated as a glance surface with a persistent header and deep-dive tabs.
- **Contents**:
  - Persistent Header: 3 OverviewCards — DRAINED (total time + burn % of elapsed day since 00:00, `CALIBRATING (<30m)` guard), VS YDAY (time + count dual delta, neutral DELTA), PEAK CHANNEL (top platform icon + time + % share).
  - Tab 1 (Today): Donut chart (time/count split) and per-platform stat rows (icon + full name — zero abbreviations, never `CH-` codes). Row click navigates to a scoped platform view (globals hidden; abandonment telemetry merged; scroll fallback).
  - Tab 2 (Signals): Scrolling diagnostics like Velocity (reels/min) and Impatience (skip %).
  - Tab 3 (Trends): Hourly/Daily waveform charts.
  - Prominent `Open full telemetry →` affordance (opens Surface B)
- Strictly monospaced, high-contrast, no gamification.

### Surface B — Full Telemetry Page (new-tab)
- **Container**: Full browser tab, opened via `chrome.tabs.create({ url })`. Responsive, full-width "Command Center".
- **Contents**:
  - Time Traversal Bar: Samsung Health-inspired navigation (`Day | 7d | 30d` with `<` and `>`).
  - Macro View: Massive, edge-to-edge Spike Waveform/Histogram mapping total and per-platform history.
  - Micro View (Bento Grid): 3-column grid below the chart for YouTube, Instagram, and Facebook. Each contains clinical, icon-driven metrics (Time, Reels, Skips, Avg flick).
  - Export JSON button
- Reuses the same tokens, components, and Do's/Don'ts.

## Elevation & Depth
Flat dark-panel layering. Depth is communicated through hairline border contrasts (`#1c2838`) and subtle phosphor glows rather than blurry drop shadows.

## Shapes
Crisp, engineered geometry with small radiuses (4px–8px). No pill-shaped buttons or playful rounded bubbles.

## Components
- **Telemetry Card**: Dark pane with 1px border and optional channel accent indicator.
- **Spike Waveform**: SVG-rendered multi-channel line chart mapping scroll bursts over time (filterable via legend, tooltip per point).
- **Platform Stat Row**: Platform icon + name, reel count, duration, and colored progress track (no `CH-` codes).
- **Action Button**: Low-profile dark button with crisp hover border.

## Do's and Don'ts
- **DO**: Keep all numbers and timestamps strictly monospaced.
- **DO**: Maintain high contrast for instant glanceability.
- **DON'T**: Add playful animations, confetti, or gamified "streaks".
- **DON'T**: Use standard Inter/Roboto sans-serif for numbers.

## Popup facts and visual polish refinement

The approved popup revision keeps the 540 × 580 chassis and coral/purple/cyan platform geometry. A single share breakdown combines the donut (with interactive hover tooltips) and clickable rows. Observational Signals (with prominent amber quick-skip badges) and the visual 24h Hourly histogram replace psychological classification and text-heavy session lists. Red remains reserved for worse deltas; magenta marks viewing-pattern content, with readable pink `#ff8fb4` for small pattern text.

Popup-only typography uses system monospace and a 12px supporting-text floor; 13px section labels, 14px metric values and 24px headline values complete its compact type scale. Secondary/muted text is scoped to `#a8b3c2`. OverviewCards maintain a calm, neutral frame with vertical gain/baseline stacking. Accessible `<Hint>` icon buttons (amber/blue) trigger high-contrast measurement popovers; the scrolling content remains separate from the pinned telemetry action.

## Telemetry intervention-insights refinement

Telemetry scopes surface `#141c26`, raised surface `#243447`, border `#3b4d63`, and supporting text `#c0cbd8` to make panel boundaries and controls easier to distinguish. Platform coral/purple/cyan stay intact; neutral legend labels use colored markers, and viewing curves add solid/dashed/dotted distinctions. The compact header groups filters and date context; an unboxed navigation row sits beneath the metric strip. Session contribution bars, observed return rates, and ranked recurring intervals lead Patterns; secondary charts remain available in expandable Period details. Icon hints hold measurement definitions rather than adding explanatory paragraphs to the canvas.

## Analysis workspace visual contract

The telemetry workspace uses an unboxed main canvas, a compact readout strip and a 420px evidence drawer. Supporting text is 13px; labels 14px, secondary values 16px, chart headings/values 18px and headline readouts 24px. Platform coral/purple/cyan remain data colors; neutral text and dashed previous-period lines provide independent distinctions. Bars share aligned labels and value columns. Rows reflow to labels above bars below 600px. A #0009 backdrop distinguishes modal evidence on narrow layouts. Scope styles under workspace-shell; do not propagate to the popup.

Visual evidence revision supersedes the 420px drawer: use a 68vw overlay (720–1040px, full width below 900px). Main content caps at 1120px, readouts use 36px values and 14px labels, and main rows target 56px. Evidence is organized on date lanes with aligned totals; measurement copy is in Hint icons.

Telemetry OverviewCard refinement: left-aligned content, four existing OverviewCards, no enclosing summary surface. Values 28px, labels 14px, support 13px; 12px padding/gaps. Returns gets 1.7 shares of desktop width and contains direct threshold actions. View navigation remains fully visible below the cards. Popup card styling stays unchanged.

Clarity color contract: usage-increased #f4b860, usage-decreased #2dd4bf. Generalized cards tint borders/icons and retain white headline values plus signed deltas. Trend chart shades: Overview #80aaff, YouTube #ff9478, Instagram #c99aff, Facebook #60d7ed; previous #e9c46a. Current uses solid 3px; previous dashed 2px. Calculated minimum contrast across root/popup/telemetry/raised surfaces is 5.50:1 for chart shades and 6.81:1 for usage accents. Platform identity colors elsewhere remain intact. Sessions uses vertical count bars in labeled unequal-width duration categories (not density); six buckets keep 30-day periods scannable.

Scannable hints: keep the icon trigger. Use one short sentence for a simple definition, otherwise aligned label/value facts and at most one qualification. Text is 13px; values wrap without truncation. Gold previous-period markers and dashed lines use the dedicated chart token, separate from usage-increase amber. Gold contrast against root/popup/telemetry/raised surfaces is 11.65/11.05/10.27/7.58:1.

Calendar evidence supersedes the long multi-day date-lane list for window and duration buckets: seven weekday columns, compact active-time values and proportionate blue bars. A white outline marks selection; platform hues remain in session spans. Unobserved cells show an em dash, partial coverage an asterisk plus a visible key. The adjacent day inspector shows one timeline, a session selector capped at 180px and two-column session metrics. Stack when the overlay is below 800px (content width below 752px after 48px padding). Keep normal date updates in place and preserve local selection on records Back.

Hint call-site audit (shared copy lives in `src/components/ui/hintContent.ts`; dates/counts remain dynamic):

| Location | Purpose / compact facts |
| --- | --- |
| Popup OverviewCards | Previous: yesterday; cutoff: same hour; equal elapsed periods |
| Telemetry filters | Selected / previous date ranges; shared cutoff or complete days |
| Telemetry quick skips | Quick skip threshold; share denominator |
| Popup SignalsTab | Skip threshold / strip scale; average / median / pause rule |
| Popup PlatformDetail | Bailed threshold / known-duration early exit |
| Popup ViewingDistribution | Bar total / active-time buckets; not completion |
| WorkspaceCanvas | Day / recurring / time share; selected / previous; session counts / grouping; viewing buckets / units |
| ReturnsControl | 5m / 15m / 30m returned and eligible counts; full follow-up, overlap and unavailable rule |
| EvidenceDrawer | Return eligibility / platform scope / daypart scope; session active / elapsed / muted spans; measured mechanic coverage |
| EvidenceTimeline | Position / elapsed span / muted context; paired-row origin / scale / gap |
| ViewingView in evidence | Survival threshold / included views; not completion |
| Retained PatternsView | Period comparison; platform comparison/shares; mechanics measurement definitions |
| Retained SessionTimeline | Grouping / original boundaries / selected scatter |
| Retained InterventionInsights | Concentration rank/share; scoped return gap/eligibility; recurring-window criteria |

Fluid page-width correction supersedes the earlier capped main canvas: telemetry content fills the available main column, with left alignment and existing 28/20/16px responsive horizontal padding. Settings no longer adds its own 860px cap. Evidence overlays and popovers keep their separate width constraints.

Range-specific evidence dates: week mode uses seven chronological buttons across the overlay, with weekday/date, exact time, reel count and 36px vertical comparison bars. Below 600px content width, buttons wrap into four columns without hiding dates. Month mode keeps weekday alignment, compact horizontal bars and 72px minimum cell height. Both show an explicit date range and selected outline; week details use four metric columns, reducing to two on narrow containers.

Calendar grid correction supersedes separated date tiles: contiguous seven-column grid with shared one-pixel rules, weekday header, square date-first cells and muted measurements. Monthly leading/trailing blanks complete calendar weeks. Week mode retains seven columns at narrow widths with contained horizontal scrolling; small 20px activity ticks replace large chart blocks. Selected dates use an inset outline and restrained tint.

Shared UI states: static neutral geometry replaces data without shimmer or fake chart traces. Templates cover one/multiple metrics, donut, chart, week/month calendar, rows, bounded record tables and settings rows. Empty/error messages use sentence case, a short explanation and a scoped action where available, without decorative state cards. Measured zero remains 0; unknown shares remain —. State controls are development-only and do not alter production navigation.

### Shared theme revision — September 2026
The current palette source is `src/theme/palette.ts`, superseding dark-only color values above. System is the default; explicit Light/Dark choices persist across popup and telemetry. Neutral page/panel/raised surfaces provide hierarchy. Controls use `border-control`; passive separators use `border-subtle`. Blue identifies interaction, platform coral/violet/cyan identify sources, amber/teal indicate increases/decreases, gold identifies the previous period, and red is reserved for urgent states. Hints and passive cards have no decorative glow or colored surface.

Charts resolve the same CSS roles as the DOM, including tooltip surfaces and sequential duration colors. All main, secondary, muted and semantic foreground roles pass 4.5:1 against all three palette surfaces; essential boundary/focus and duration colors pass 3:1. This is a numeric palette check, not a claim of completed visual/accessibility acceptance. Manually inspect both themes and OS switching, donut hover, dialog hints, calendar selection, chart legends, table controls and state previews. Browser automation was intentionally not used.

Settings retains available width. At 1040px of content width, stop-loss configuration and summary/preview form two columns; below that they stack. Appearance is saved independently of the stop-loss mock and its development state previews.
