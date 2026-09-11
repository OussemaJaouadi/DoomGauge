# DoomGauge

- Personal Chrome extension; YouTube Shorts, Instagram Reels, Facebook Reels.

## Goal
- Daily count + active time, per platform; support ADHD awareness.
- v1: local analysis. Future: richer insights and limits.

## How to work (spec-driven)
- `.spec/<version>/`: implementation contract. `docs/`: product/design guide.
- Do not implement without a spec item in the active `.spec/<version>/`.
- Validate spec acceptance criteria before marking done.
- Docs: short bullets, tables, accurate Mermaid; each rule once.
- Edit existing sections with targeted patches; history belongs in Git.
- Shared types → `src/types`; reusable helpers → `src/utils`.
- Code: descriptive names, braced control flow, one operation per line; name complex conditions.
- Hygiene: follow `docs/STANDARDS.md` (import order, SSOT types, human intervals).
- Commit only after the user's manual testing and explicit approval.

## Docs
- docs/STANDARDS.md     — code hygiene, import tree standards, SSOT & architecture
- .spec/doom-gauge-v1/spec.md   — v1 requirements + acceptance criteria (SSOT for build)
- .spec/doom-gauge-v1/design.md — v1 module, data & component design (SSOT for build)
- docs/DESIGN.md        — visual system (Neuro-Spike Telemetry) & design tokens
- docs/FEATURES.md      — vision map v1 vs future (points to .spec/ for AC)
- docs/ARCHITECTURE.md  — system shape, data flow, storage (overview; details in .spec/)
- docs/PSYCHOLOGY.md    — cognitive preferences and interpretation limits
- docs/STACK.md         — tooling + dependencies + rationale

## Commit convention
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

- Format: `<icon> <type>: <short present-tense summary>`.

## Run / test (bun)
- dev:    `bun run dev`    (WXT hot-reload)
- build:  `bun run build`
- test:   `bun run test`
