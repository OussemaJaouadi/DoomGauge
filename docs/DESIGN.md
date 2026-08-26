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
  platform-yt: "#ff3366"
  platform-ig: "#d62976"
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
  - **YouTube Shorts**: High-voltage crimson `#ff3366`
  - **Instagram Reels**: Electric magenta/purple `#d62976`
  - **Facebook Reels**: Signal cyan `#00b4d8`
  - **Global Status / Awareness**: Phosphor green `#00ff88`

## Typography
Monospace-first across all metrics, timestamps, and headers. Numbers and telemetry values are strictly monospaced to prevent layout jitter during live count changes.

## Layout
- **Container**: Compact Chrome Extension Popup (400px × 540px).
- **Header**: Telemetry channel status + total active attention lost.
- **Waveform Chamber**: Multi-channel frequency trace graphing scroll bursts per platform.
- **Summary Metrics**: Monospace grid with large digits, unit badges, and platform badges.
- **Controls Footer**: Export JSON button and 7-day mini sparkline.

## Elevation & Depth
Flat dark-panel layering. Depth is communicated through hairline border contrasts (`#1c2838`) and subtle phosphor glows rather than blurry drop shadows.

## Shapes
Crisp, engineered geometry with small radiuses (4px–8px). No pill-shaped buttons or playful rounded bubbles.

## Components
- **Telemetry Card**: Dark pane with 1px border and optional channel accent indicator.
- **Spike Waveform**: SVG-rendered multi-channel line chart mapping scroll bursts over time.
- **Platform Stat Row**: Fixed-width platform code (`CH-01 // YT`), reel count, duration, and colored progress track.
- **Action Button**: Low-profile dark button with crisp hover border.

## Do's and Don'ts
- **DO**: Keep all numbers and timestamps strictly monospaced.
- **DO**: Maintain high contrast for instant glanceability.
- **DON'T**: Add playful animations, confetti, or gamified "streaks".
- **DON'T**: Use standard Inter/Roboto sans-serif for numbers.
