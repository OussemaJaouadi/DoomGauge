# DoomGauge

Local-first Chrome extension that quantifies your doom-scrolling on
YouTube Shorts, Instagram Reels & Facebook Reels — reel count + active time
per platform, to build awareness and reclaim your attention.

## Why
Built for personal use to understand *how much* reels I scroll daily, with
the long-term goal of richer "brain metrics." Not SaaS, not a product.

## Privacy
**Nothing leaves your browser.** All data lives in IndexedDB on your machine.
No accounts, no telemetry, no backend (v1).

## Install (unpacked, v1)
1. `bun install`
2. `bun run build`
3. Chrome → `chrome://extensions` → enable Developer mode → Load unpacked →
   select the generated build output folder.

## Docs
- `docs/FEATURES.md` — what we build (v1 + roadmap)
- `docs/ARCHITECTURE.md` — system shape, data flow, storage
- `docs/STACK.md` — tooling + dependencies

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

## License
[0BSD](LICENSE) — public-domain equivalent, do whatever you want.
