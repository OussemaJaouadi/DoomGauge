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

## Overview
DoomGauge uses an EEG/Neuro-Spike Telemetry visual system designed specifically for ADHD attention awareness. Instead of bland corporate cards or gamified badges, it frames doom-scrolling as raw bio-telemetry: high-contrast dark plates, precise oscilloscope grids, and glowing frequency channels.

## Colors
- **Ground / Chassis**: Abyssal charcoal `#090d13` with subtle grid lines `#16222f`.
- **Text / Readouts**: Crisp high-contrast white `#f0f6fc` and muted slate `#8b949e`.
- **Telemetry Channels**:
  - **YouTube Shorts**: Warm coral-vermilion `#ff6b4a` — hue ~11°, warm and distinct from severity red
  - **Instagram Reels**: Violet-purple `#a855f7` — hue 270°, ~100° from YT for instant distinguish
  - **Facebook Reels**: Signal cyan `#00b4d8` — hue 192°, far from both
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
