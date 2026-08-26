# Stack

## Runtime / package manager
**bun** — install, dev, build, test, and type-check runner. Fast, already on machine.

## Language
**TypeScript 7** (native Go compiler, `tsgo`) — drop-in `tsc` for `tsc --noEmit`
type-checking. Build/transpile is handled by esbuild via WXT/Vite, so the
toolchain carries no API-risk from the native port.

## Framework
**WXT** — TypeScript WebExtension framework (Chrome now; multi-browser ready).

## Build
WXT → Vite → **esbuild** (Go, fast). No webpack/Turbopack needed.

## Charts
**uPlot** — lightweight dashboard charts.

## Tests
**bun test** — built-in, fast; covers aggregation/rollup logic.

## Rationale
- Local-first; no server. Multi-window safe via shared IndexedDB.
- All three hot paths are native/fast: bun (install + run), esbuild (build),
  tsgo (type-check). No npm slowness anywhere.
- Backend + DuckDB-WASM are future, opt-in concerns.
