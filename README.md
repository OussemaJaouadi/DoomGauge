# DoomGauge

- Track reel visits and active time.
- YouTube Shorts · Instagram Reels · Facebook Reels.
- Personal Chrome extension; local data; no account.

## Run

```sh
bun install
cp .env.example .env.local
bun run dev
```

- Chrome → Extensions → **Load unpacked** → `.output/chrome-mv3-dev`.

| `.env.local` | Data | State previews | Tracking |
| --- | --- | --- | --- |
| `WXT_DATA_MODE=dev` | Fixtures | Shown | Off |
| `WXT_DATA_MODE=actual` | Local records | Hidden | On |

- Env changed? Restart WXT.
- Extension reloaded? Refresh platform tabs.
- Unset mode → actual.
- Actual build: `bun run build:actual`; load `.output/chrome-mv3`.
- Checks: `bun run test` · `bun run typecheck`.

## Read next

- **Understand:** [Architecture](docs/ARCHITECTURE.md) · [Features](docs/FEATURES.md).
- **Build:** [Requirements](.spec/doom-gauge-v1/spec.md) · [Visual rules](docs/DESIGN.md).
- **Validate:** [Remaining checks](.spec/doom-gauge-v1/tasks.md).
- [0BSD license](LICENSE).
