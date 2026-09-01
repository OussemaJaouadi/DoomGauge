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
**uPlot** — lightweight dashboard charts.

## Tests
**bun test** — built-in, fast; covers aggregation/rollup logic (`src/__tests__/` validates P1–P7).

## Conventions
- Single source of truth: `.spec/doom-gauge-v1/spec.md` + `design.md`.
- **Option A:** Only Background SW reads/writes IndexedDB; UI surfaces use `chrome.runtime.sendMessage`.
- **Local dates:** `YYYY-MM-DD` is local wall-clock; `chrome.alarms` at local midnight.
- Popup size is under study: content → tabs → layout → size (current mock ≈540×580); spec `400×540` cap is deferred.
- No `CH-` codes — platform rows use `lucide-react` icon + name.
- Mock layer: `DEV`-only typed factories (e.g. `src/mocks/fixtures.ts`) injected via props; `createClient` abstraction deferred until data schema settles.

## Rationale
- Local-first; no server. Multi-window safe via shared IndexedDB.
- All three hot paths are native/fast: bun (install + run), esbuild (build),
  tsgo (type-check). No npm slowness anywhere.
- Backend + DuckDB-WASM are future, opt-in concerns.
