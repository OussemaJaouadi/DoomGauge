# DoomGauge

A personal (non-SaaS) Chrome extension to quantify doom-scrolling on
short-form video: YouTube Shorts, Instagram Reels, Facebook Reels.

## Goal
Build awareness of *how much* reels I scroll daily (count + active time),
per platform, to reduce its impact on my ADHD. v1 is analysis-only
(local, in-browser). Future versions add richer "brain metrics".

## How to work (spec-driven)
- `.spec/<version>/` is the implementation source of truth (per-version spec + design with AC). `docs/` is the product/design companion.
- Do not implement without a spec item in the active `.spec/<version>/`.
- Each feature has acceptance criteria in `.spec/<version>/spec.md`. Validate before marking done.
- Amend `docs/FEATURES.md` + `docs/ARCHITECTURE.md` as scope grows — never rewrite.

## Docs
- .spec/doom-gauge-v1/spec.md   — v1 requirements + acceptance criteria (SSOT for build)
- .spec/doom-gauge-v1/design.md — v1 module, data & component design (SSOT for build)
- docs/DESIGN.md        — visual system (Neuro-Spike Telemetry) & design tokens
- docs/FEATURES.md      — vision map v1 vs future (points to .spec/ for AC)
- docs/ARCHITECTURE.md  — system shape, data flow, storage (overview; details in .spec/)
- docs/STACK.md         — tooling + dependencies + rationale

## Commit convention
Commits are prefixed with a meaningful icon + a Conventional Commits type:

| Icon | Type | When |
| --- | --- | --- |
| 💡 | `feat` | new functionality |
| ✨ | `ui` | dashboard / visual / polish |
| 🐛 | `fix` | bug fix |
| ♻️ | `refactor` | restructure, no behavior change |
| ✅ | `test` | tests |
| 🔧 | `setup` | tooling, deps, config, package install |
| 🔒 | `security` | permissions, privacy |
| ⚡ | `perf` | speed/memory |
| 🏗️ | `build` | WXT/build setup |
| 🚨 | `lint` | lint/style |
| 📝 | `docs` | specs, README, repo meta |
| 🌱 | `init` | initial project setup (first commit only) |
| 🗄️ | `backend` | server / DuckDB / API side |

Format: `<icon> <type>: <short present-tense summary>`

## Run / test (bun)
- dev:    `bun run dev`    (WXT hot-reload)
- build:  `bun run build`
- test:   `bun run test`
