# Engineering Standards (Code Quality, Architecture & Hygiene)

> **Core Axiom**: Code must be HUMAN-READABLE first. Clear import trees, explicit types, and single-source-of-truth architectures enable both humans and AI agents to track codebases effortlessly without cognitive drift.

---

## 1. Import Tree Standard

Every TypeScript / TSX file must group and annotate imports using explicit section headers. Never dump loose, unorganized imports at the top of a file.

### Canonical Section Order:
```tsx
// React & 3rd-party
import React, { useState, useEffect, type CSSProperties } from 'react';
import { Clock, Zap } from 'lucide-react';
import { ComposedChart, Bar, ResponsiveContainer } from 'recharts';

// Types & Models
import type { Platform, PlatformStats } from '../../types/models';
import type { TemporalInsights, ViewingDistribution } from '../../types/popup';

// UI Components
import { Hint } from '../ui/Hint';
import { StateRegion } from '../ui/StateRegion';

// Tokens & Meta
import { chartTokens } from '../tokens';
import { platformMeta } from '../platformMeta';

// Utilities & Helpers
import { formatTime } from '../../utils/time';
import { avgFlickSec } from '../../utils/metrics';

// Styles
import './ComponentName.css';
```

### Import Rules:
1. **Type Imports**: Always use `import type { ... }` for pure types to ensure clean bundle tree-shaking and immediate visual clarity.
2. **Predictable Order**: `React & 3rd-party` → `Types & Models` → `UI Components` → `Tokens & Meta` → `Utilities & Helpers` → `Styles`.
3. **No Mixed Sections**: Do not place UI components under `// Styles & Tokens` or helpers under `// Types`.
4. **Omission**: Omit a section comment only if the file contains zero imports from that category.

---

## 2. Single Source of Truth (SSOT) & DRY

If a type, interface, constant, spec, or calculation is used in more than one place, it **must be defined once** in its canonical home.

| Artifact | Canonical Location | Rule |
| :--- | :--- | :--- |
| **Domain Types & Interfaces** | `src/types/` | Never define domain types inside `utils/` or infer them ad-hoc via `ReturnType<typeof ...>`. |
| **Engine & Tracking Constants** | `src/config/` | Sample intervals, tolerance windows, gap thresholds (`SESSION_BREAK_MS`) belong in `src/config/`. |
| **Data Buckets & Intervals** | `src/types/telemetry.ts` | Bucket specs (`DURATION_BUCKETS`, `SESSION_BUCKETS`) are canonical contracts defined once. |
| **Visual & Chart Tokens** | `src/components/tokens.ts` | Colors, radii, typography tokens. |
| **Functional Helpers** | `src/utils/` | Reusable, pure functional helpers only. |

- **Zero Duplication**: Never copy-paste bucket configurations or magic numbers across multiple files. Derive UI and analytics dynamically from the canonical specs.

---

## 3. Human-First Interface Contracts & Telemetry Labels

- **No Mathematical Clutter in UI**: Never expose internal mathematical half-open interval notations (such as `3–<10s`, `10–<30s`, `1–<3m`, or `≥20m`) to the UI or public contracts.
- **Human Telemetry Ranges**:
  - Duration intervals: `<3s`, `3–10s`, `10–30s`, `30–60s`, `>60s` (or `60s+`).
  - Session intervals: `<1m`, `1–3m`, `3–5m`, `5–10m`, `10–20m`, `>20m` (or `20m+`).
- **Telemetry Tone**: Objective, scientific, non-judgmental instrument tone. High data-ink ratio.

---

## 4. Code Readability & Control Flow

1. **Braced Control Flow**: Always brace `if`, `else`, `for`, `while` blocks. No inline single-line statements that obscure branching logic.
2. **One Operation Per Line**: Break chained operations into readable, debuggable steps.
3. **Name Complex Conditions**: Extract multi-clause conditionals into descriptive boolean constants (`const isWithinBreakThreshold = ...;`).
4. **Explicit Domain Types**: Write out intentional interfaces for dashboard models and contract payloads rather than relying on loose type inference.
