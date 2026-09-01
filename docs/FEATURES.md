# Features

Scope is split into **v1** (what we build now) and **future** (roadmap).
Visual over prose — see the maps below.

> **Spec source of truth for v1 implementation:** `.spec/doom-gauge-v1/spec.md` (requirements + AC) and `.spec/doom-gauge-v1/design.md` (module/data design). This doc is the high-level vision map.

## v1 vs Future

```mermaid
mindmap
  root((DoomGauge))
    v1
      YouTube Shorts
      Instagram Reels
      Facebook Reels
      Daily rollup
      Dashboard
      Minified export
    Future
      Tab-switch unfinished
      Watch-later opens
      IG messaging time
      Content categorization
      Backend + multi-browser
```

## v1 — what ships

```mermaid
flowchart TD
  subgraph track["Tracked per platform"]
    C[Reel count]
    T[Active time]
  end
  YT[YouTube Shorts] --> C
  YT --> T
  IG[Instagram Reels] --> C
  IG --> T
  FB[Facebook Reels] --> C
  FB --> T
  C --> R[Daily rollup]
  T --> R
  R --> D[Dashboard]
  R --> E[Minified JSON export]
```

## Future — roadmap

```mermaid
flowchart LR
  A[Tab-switch / unfinished videos]
  B[Watch-later tab opens]
  C[IG messaging time]
  D[Content categorization]
  E[Backend + multi-browser sync]
  D --> D1[learning vs fun ratio]
  A --> F[Brain metrics]
  B --> F
  C --> F
  D1 --> F
  E --> F
```

## Where to implement

| Doc | Role |
|-----|------|
| `.spec/doom-gauge-v1/spec.md` | AC for each v1 feature (Requirements 1–9, P1–P7) |
| `.spec/doom-gauge-v1/design.md` | Data types, file tree, component design (Option A: BG sole DB reader, local dates, videoDurationMs) |
| `docs/ARCHITECTURE.md` | System-shape overview (diagrams) — details in `.spec/` |
| `docs/DESIGN.md` | Visual system (Neuro-Spike Telemetry) & design tokens |
| `docs/STACK.md` | Tooling + dependencies |
