# AGENTS.md — Copycat (KopiCat)

## Project
ICP clip storage app. Backend: Motoko canister. Frontend: SvelteKit SPA.
**Uses `icp` CLI, not `dfx`.** No `icp.yaml` or `dfx.json` in the repo.

## Architecture
- **Backend**: `backend/main.mo` — Motoko `persistent actor` with clip CRUD (create, get, stats). Uses `mo:core` primitives (Map, Int, Text, etc.). Clips have TTL (default 7 days), max blob size (1MB), and optional burn-after-read.
- **Frontend**: `frontend/` — Svelte 5 + SvelteKit 2 app, static adapter build. Entry: `frontend/routes/+page.svelte` (send flow), `+page.ts` (receive/decrypt).
- **Local store**: `frontend/lib/api/local-store.ts` — clips stored in `localStorage` (key: `copycat`). Supports scratchpad (edited unsaved clips), receiving clips (QR/URL polling), and save-to-collection.
- **Crypto**: `frontend/lib/crypto.ts` — encryption/decryption of clip blobs.
- **Backend API**: `frontend/lib/api/client.ts` — calls backend canister via `@icp-sdk/core`.
- **Assets**: `static/` — served by backend canister as `mo:assets`.

## Build & run
```
make backend        # Builds build/copycat.wasm + .did (vessel + moc, version from vessel.dhall)
pnpm build          # Builds frontend into dist/
pnpm check          # svelte-check
pnpm test           # vitest run (jsdom, files: frontend/**/*.test.ts)
make                # builds backend + frontend (full)
pnpm dev            # Vite dev server (frontend only)
```
Always use `pnpm`, never `npm`.

## Deploy
```
icp deploy          # Deploys backend canister
icp sync            # Syncs dist/ assets to canister
```
Backend build artifacts: `build/copycat.wasm`, `build/copycat.did`, `build/copycat-did.ts`, `build/copycat-did.mjs`.

## Key files
- `backend/main.mo` — clip canister (create_clip, get_clip, get_stats)
- `vessel.dhall` + `package-set.dhall` — Motoko deps + compiler version
- `Makefile` — orchestrates vessel, moc, didc for backend build
- `frontend/routes/+page.svelte` + `frontend/routes/+page.ts` — send/receive pages
- `frontend/lib/api/local-store.ts` — localStorage clip store with scratchpad support
- `frontend/lib/components/ClipDisplay.svelte` — shared clip viewer/editor
- `frontend/lib/components/GridView.svelte` — clip grid with focus/maximize
- `frontend/tests/setup.ts` — vitest setup (msw, etc.)
- `.agents/skills/` — OpenCode skill definitions

## Gotchas
- `persistent actor` auto-persists all `let`/`var` declarations; use `transient` for non-persistent state (e.g. `total_clips_created` is intentionally `var` not `transient` since it's a counter, but other derived state should use `transient`).
- Frontend source is under `frontend/`, not `src/`. Vitest aliases: `$lib` → `frontend/lib`, `$app` → `frontend/app`, `$generated` → `build`.
- Tests use `jsdom` environment (not `happy-dom`).
- `DESIGN.md` describes aspirational clip-storage with encryption and CRUD. **Trust the actual `backend/main.mo` and `frontend/` code over DESIGN.md.**
- Receiving clips: `GridView` polls via URL/QR — sets `receiving: true` on the clip, then polls the backend every 5s to fetch and decrypt.
- Scratchpad: clips edited but unsaved live in `localStorage` under a separate key prefix. `isOnScratchpad()` checks this.
- Svelte 5 runes: uses `$state`, `$derived`, `$effect`, `$bindable`, `$props`. No stores pattern.

## Skills
`load` skills from `.agents/skills/` for domain-specific guidance:
- **motoko** — Motoko pitfalls, stable types, mo:core standard library
- **stable-memory** — persisting state across canister upgrades
- **certified-variables** — certified data API, certificate validation
- **canhelp** — querying canister interfaces by canister ID
