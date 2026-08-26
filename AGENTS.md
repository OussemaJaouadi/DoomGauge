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
- docs/FEATURES.md      — what we build (v1 + roadmap), visual
- docs/ARCHITECTURE.md  — system shape, data flow, storage (mermaid)
- docs/STACK.md         — tooling + dependencies + rationale
- docs/RULES.md         — conventions (added later)

## Run / test (bun)
- dev:    `bun run dev`    (WXT hot-reload)
- build:  `bun run build`
- test:   `bun run test`
