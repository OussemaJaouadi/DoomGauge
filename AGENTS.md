# DoomGauge

A personal (non-SaaS) Chrome extension to quantify doom-scrolling on
short-form video: YouTube Shorts, Instagram Reels, Facebook Reels.

## Goal
Build awareness of *how much* reels I scroll daily (count + active time),
per platform, to reduce its impact on my ADHD. v1 is analysis-only
(local, in-browser). Future versions add richer "brain metrics".

## How to work (spec-driven)
- `docs/` is the single source of truth. Do not implement without a spec item.
- Each feature has acceptance criteria. Validate before marking done.
- Amend `docs/FEATURES.md` + `docs/ARCHITECTURE.md` as scope grows — never rewrite.

## Docs
- docs/PRODUCT.md       — product purpose, users, constraints & principles
- docs/DESIGN.md        — visual system (Neuro-Spike Telemetry) & design tokens
- docs/FEATURES.md      — what we build (v1 + roadmap), visual
- docs/ARCHITECTURE.md  — system shape, data flow, storage (mermaid)
- docs/STACK.md         — tooling + dependencies + rationale
- docs/RULES.md         — conventions (added later)

## Commit convention
Commits are prefixed with a meaningful icon + a Conventional Commits type:

| Icon | Type | When |
| --- | --- | --- |
| 💡 | `feat` | new functionality |
| ✨ | `ui` | dashboard / visual / polish |
| 🐛 | `fix` | bug fix |
| ♻️ | `refactor` | restructure, no behavior change |
| ✅ | `test` | tests |
| 🔧 | `chore` | tooling, deps, config |
| 🔒 | `security` | permissions, privacy |
| ⚡ | `perf` | speed/memory |
| 🏗️ | `build` | WXT/build setup |
| 🚨 | `lint` | lint/style |
| 📝 | `docs` | specs, README, repo meta |
| 🌱 | `chore` | initial project setup (first commit only) |
| 🗄️ | `backend` | server / DuckDB / API side |

Format: `<icon> <type>: <short present-tense summary>`

## Run / test (bun)
- dev:    `bun run dev`    (WXT hot-reload)
- build:  `bun run build`
- test:   `bun run test`
