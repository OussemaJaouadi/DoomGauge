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
  platform-yt: "#ff3344"
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

## Overview
DoomGauge uses an EEG/Neuro-Spike Telemetry visual system designed specifically for ADHD attention awareness. Instead of bland corporate cards or gamified badges, it frames doom-scrolling as raw bio-telemetry: high-contrast dark plates, precise oscilloscope grids, and glowing frequency channels.

## Colors
- **Ground / Chassis**: Abyssal charcoal `#090d13` with subtle grid lines `#16222f`.
- **Text / Readouts**: Crisp high-contrast white `#f0f6fc` and muted slate `#8b949e`.
- **Telemetry Channels**:
  - **YouTube Shorts**: Signal red `#ff3344` — hue 356°, high-voltage crimson
  - **Instagram Reels**: Violet-purple `#a855f7` — hue 270°, ~86° from YT for instant distinguish
  - **Facebook Reels**: Signal cyan `#00b4d8` — hue 192°, far from both
  - **Global Status / Awareness**: Phosphor green `#00ff88`

## Typography
Monospace-first across all metrics, timestamps, and headers. Numbers and telemetry values are strictly monospaced to prevent layout jitter during live count changes.

## Layout

### Surface A — Popup (glance)
- **Container**: Chrome popup — size under study (≈540 px width in current mock; final derived from tab content → tabs → layout → size). Treated as a glance surface with tabs (Today / Signals / Trends) under study.
- **Contents** (tabbed, under study):
  - Doom Score (time + count side-by-side, `icon: value` legend line)
  - Per-platform rows (icon + name, no `CH-` codes) + Velocity / Impatience cards (Signals tab)
  - 7-day sparkline (combined + per-platform, filterable legend with tooltip)
  - Prominent `Open full telemetry →` affordance (opens Surface B)
- Strictly monospaced, high-contrast, no gamification. Legend uses `icon: value` + own line for time; legend entries toggle series.

### Surface B — Full Telemetry Page (new-tab)
- **Container**: Full browser tab, opened via `chrome.tabs.create({ url })`. Responsive, full-width.
- **Contents**:
  - Header: telemetry channel status + total active attention lost
  - Spike Waveform: multi-channel scroll-burst trace (filterable legend `icon: value`, tooltip per point)
  - Platform Stat Rows: platform icon + name … count, duration, colored track (no `CH-` codes)
  - 7-day / 30-day toggle views
  - Brain Composition (future)
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
