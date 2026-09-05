# Stack

## Runtime / package manager
**bun** — install, dev, build, test, and type-check runner. Fast, already on machine.

## Language
**TypeScript 7** (native Go compiler, `tsgo`) — drop-in `tsc` for `tsc --noEmit`
type-checking. Build/transpile is handled by esbuild via WXT/Vite, so the
toolchain carries no API-risk from the native port.

## Framework
**WXT + React** (`@wxt-dev/module-react`) — TypeScript WebExtension framework (Chrome now; multi-browser ready). Vanilla was a brainstorm error; popup needs state/query handling, frequent data churn, and component decomposition.

## Build
WXT → Vite → **esbuild** (Go, fast). No webpack/Turbopack needed.

## Charts
**Recharts** — React-based declarative charting library used for Donut, ComposedChart, and LineCharts.

## Tests
**bun test** — built-in, fast; covers aggregation/rollup logic (`src/__tests__/` validates P1–P7).

## Conventions
- Single source of truth: `.spec/doom-gauge-v1/spec.md` + `design.md`.
- **Option A:** Only Background SW reads/writes IndexedDB; UI surfaces use `chrome.runtime.sendMessage`.
- **Local dates:** `YYYY-MM-DD` is local wall-clock; `chrome.alarms` at local midnight.
- Popup size decided: 540×580 px fixed (old 400×540 cap retired).
- No `CH-` codes and no 2-letter abbreviations — platform rows use `lucide-react` icon + full name (tooltips/legends included).
- Mock layer (UI-mock phase, see `.spec/doom-gauge-v1/tasks.md`): direct `import { MOCK } from data/mock` is intentional until UI is approved; `createClient` abstraction deferred until data schema settles. Agents SHALL NOT flag mock imports while phase=mock.

## Rationale
- Local-first; no server. Multi-window safe via shared IndexedDB.
- All three hot paths are native/fast: bun (install + run), esbuild (build),
  tsgo (type-check). No npm slowness anywhere.
- Backend + DuckDB-WASM are future, opt-in concerns.
