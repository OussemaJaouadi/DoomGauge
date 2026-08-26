# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
WXT, TypeScript, bun, esbuild/Vite, uPlot, IndexedDB

## Users
Individual managing ADHD seeking clear awareness and agency over short-form video consumption habits.

## Product Purpose
Quantify daily short-form video doom-scrolling (reel count and active watch time) across YouTube Shorts, Instagram Reels, and Facebook Reels to build attention awareness and reduce compulsive scrolling.

## Positioning
100% local, zero-telemetry, non-SaaS Chrome extension that measures attention consumption without collecting data or requiring accounts.

## Operating Context
Runs quietly in Chrome across multiple browser windows during daily web browsing; accessed via the extension popup dashboard.

## Capabilities and Constraints
- **v1 Capabilities**:
  - Content scripts tracking active watch time and scroll count on YouTube Shorts, Instagram Reels, and Facebook Reels.
  - Background Service Worker aggregating events into daily rollups in IndexedDB.
  - Extension popup dashboard with time/count summaries and charts.
  - Minified JSON export of daily rollups.
- **Constraints**:
  - Analysis-only for v1 (no blocking/intervention).
  - No external backend or cloud sync.
  - Local-first IndexedDB storage per browser profile.

## Brand Commitments
- Name: DoomGauge
- Tone: Honest, direct, objective, calm, non-judgmental.

## Product Principles
- **Local-First & Private**: Data never leaves the browser.
- **Zero Friction**: Passive, accurate measurement without slowing down page performance.
- **Clear & Uncluttered**: Show actionable metrics at a glance without cognitive overload.
- **Spec-Driven**: Features strictly adhere to `docs/`.

## Accessibility & Inclusion
- High contrast, easily legible metrics designed to be ADHD-friendly and low-cognitive-load.
