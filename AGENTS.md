# AGENTS.md — KopiCat

## Project
ICP clip storage app. Backend: Motoko canister. Frontend: SvelteKit SPA.
**Uses `icp` CLI, not `dfx`.** There is an `icp.yaml` in the repo (no `dfx.json`).

## Architecture

### Backend
- **`backend/main.mo`** — Motoko `persistent actor class` with clip CRUD (`create_clip`, `get_clip`, `get_stats`).
- Uses `mo:core` primitives (Map, Int, Text, Blob, Time, Result, Option).
- **Canister init args**: `?{ max_seconds_to_live: Nat; max_blob_bytes: Nat }` (both optional).
- Clips have TTL (default 7 days), max blob size (default 1MB), and optional `burn_after_read`.
- `create_clip` is an **update** call; `get_clip` is a **query** call (best-effort expiry check, cannot mutate state); `get_stats` is an **update** call (iterates and computes live stats).
- `persistent actor` auto-persists all `let`/`var` declarations across upgrades.

### Frontend
- **`frontend/`** — Svelte 5 + SvelteKit 2 app, **static adapter** (`@sveltejs/adapter-static`), build output to `dist/`.
- **Routes** (all under `frontend/routes/`):
  - `+page.svelte` — Home/idle (paste, receive via QR, share).
  - `send/+page.svelte` — Sender mode (receiver shares their clip ID + password hash; sender pastes text here).
  - `share/+page.svelte` — Create/edit clip form (chooser mode for picking existing local clips).
  - `view/+page.svelte` + `view/+page.ts` — Receive/decrypt clip (`?clip=ID#password`).
  - `list/+page.svelte` + `list/+page.ts` — Saved clips grid (focus, maximize, edit, delete, share).
  - `faq/+page.svelte` — FAQ page.
- **Layout**: `+layout.svelte` (global styles, CSS vars, meta tags, service worker registration), `+layout.ts`.
- **Global styles & CSS vars** are defined in `+layout.svelte` `:global()` blocks.

### Key modules
- **`frontend/lib/api/client.ts`** — Thin wrapper around `createClip` / `fetchClip` from `$lib/icp/actor`.
- **`frontend/lib/icp/actor.ts`** — Actor creation via `@icp-sdk/core`; handles `HttpAgent`, `Ed25519KeyIdentity`, `Principal`, and Candid `idlFactory` from `$generated/backend-did`. Canister ID injected at build time via `BACKEND_CANISTER_ID` (from `.icp/data/mappings/ic.ids.json` or `.icp/cache/mappings/local.ids.json`).
- **`frontend/lib/api/local-store.ts`** — **IndexedDB** persistence (db name `copycat`, store `clips`). In-memory Map cache with dirty/removed tracking. Supports legacy migration from `localStorage` key `copycat_clips`.
- **`frontend/lib/api/store.ts`** — Svelte `writable` stores for cross-component state: `modalState`, `clipState`, `sendState`, `shareState`, `headerClipCount`.
- **`frontend/lib/crypto.ts`** — Client-side AES-256-GCM encryption. Key derived via PBKDF2 (100k iterations, SHA-256). Ciphertext layout: `salt(16) + iv(12) + ciphertext`.
- **`frontend/lib/words.ts`** — 2020-word dictionary. `generateClipId()` produces human-readable 3-word IDs (`word-word-word`) with ~44 bits of entropy.
- **`frontend/lib/qr.ts`** — QR rendering with central logo overlay (`kopicat-logo.png`).

### Assets & PWA
- **Source assets**: `assets/kopicat.png`. Makefile resizes it into `static/` (favicons, apple-touch-icon, etc.).
- **`frontend/service-worker.ts`** — Workbox PWA (`injectManifest` strategy). Precaches build output; images use `StaleWhileRevalidate` with 30-day expiration.
- **CSP** (production only, in `svelte.config.js`): `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self' https://icp-api.io`.

## Build & run
```bash
make backend        # Builds build/backend.wasm + build/backend.did (vessel + moc, version from vessel.dhall)
make frontend       # Runs pnpm build (Vite static build → dist/)
make                # Builds backend + frontend + assets
make assets         # Resizes source images into static/
pnpm build          # Vite build (frontend only)
pnpm check          # svelte-check
pnpm test           # vitest run (jsdom, files: frontend/**/*.test.ts)
pnpm dev            # Vite dev server (frontend only, proxies /api to local replica)
```
Always use `pnpm`, never `npm`.

## Deploy
```bash
icp deploy          # Deploys canisters per icp.yaml (backend + frontend asset canister)
icp sync            # Syncs dist/ assets to the frontend asset canister
```
`icp.yaml` specifies:
- **Backend**: build script runs `make backend`, copies `build/backend.wasm` to `$ICP_WASM_OUTPUT_PATH`.
- **Frontend**: `@dfinity/asset-canister@v2.1.0` recipe, `dir: dist`, build: `make frontend`.

## Backend build artifacts
- `build/backend.wasm`
- `build/backend.did`
- `build/backend-did.ts` (Candid → TypeScript)
- `build/backend-did.mjs` (Candid → JS)

## Key files
- `backend/main.mo` — clip canister API
- `backend/test.mo` — standalone Motoko test snippet (HashMap path matching experiments)
- `vessel.dhall` + `package-set.dhall` — Motoko deps (`mo:core` v2.5.0) + compiler version (1.7.0)
- `Makefile` — orchestrates `vessel`, `moc`, `didc`, and ImageMagick `magick` for asset resizing
- `icp.yaml` — `icp` CLI deployment manifest
- `frontend/routes/+page.svelte` — home page
- `frontend/routes/send/+page.svelte` — send flow
- `frontend/routes/share/+page.svelte` — create/share flow
- `frontend/routes/view/+page.svelte` + `view/+page.ts` — receive/decrypt flow
- `frontend/routes/list/+page.svelte` + `list/+page.ts` — saved clips grid
- `frontend/lib/api/local-store.ts` — IndexedDB clip store
- `frontend/lib/api/store.ts` — Svelte writable stores
- `frontend/lib/components/ClipDisplay.svelte` — shared clip viewer/editor
- `frontend/lib/components/GridView.svelte` — clip grid with focus/maximize/chooser
- `frontend/lib/components/CreateForm.svelte` — clip creation form
- `frontend/lib/components/DecryptForm.svelte` — password entry for decryption
- `frontend/lib/components/ResultView.svelte` — decrypted clip display with save/copy
- `frontend/tests/setup.ts` — vitest setup (fake-indexeddb, mocks, in-memory backend clipStore)
- `.agents/skills/` — OpenCode skill definitions

## Gotchas
- **Frontend source is under `frontend/`, not `src/`**. SvelteKit `files` config in `svelte.config.js` points routes/lib/hooks there.
- **Vitest aliases**: `$lib` → `frontend/lib`, `$app` → `frontend/app`, `$generated` → `build`. Note: `$app/navigation` and `$app/paths` have **stub files** in `frontend/app/` (`navigation.ts`, `paths.ts`) specifically for test resolution.
- **Svelte 5 runes**: Components use `$state`, `$derived`, `$effect`, `$bindable`, `$props`. However, some global state (modals, clip state) still uses Svelte `writable` stores from `frontend/lib/api/store.ts`.
- **Tests use `jsdom`** (not `happy-dom`). Many browser APIs are mocked in `frontend/tests/setup.ts`: `indexedDB` (fake-indexeddb), `prismjs`, `qrcode`, `navigator.clipboard`, `navigator.mediaDevices`, `matchMedia`, `ResizeObserver`, `Element.prototype.animate/getAnimations`, `HTMLCanvasElement.getContext`, `ClipboardEvent`.
- **DESIGN.md.bak** describes aspirational features. **Trust the actual `backend/main.mo` and `frontend/` code over `DESIGN.md.bak` / `PRD.md`**.
- **Receiving clips**: `/list` → "Receive" generates a receiving clip (ID + password in URL hash). Another device scans QR or visits `/send?clipId#password`, pastes text, and the receiver's `GridView` polls the backend via `fetchClip` + `decrypt`, then updates the local clip text and clears `receiving` flag. Polling is chained `setTimeout`-based, not a fixed interval.
- **Scratchpad / dirty clips**: Clips edited in `GridView` but not yet saved to IndexedDB are tracked via the `edits` SvelteSet. `isDirty(id)` checks the local-store dirty set.
- **GridView URL sync**: `focusClip` and `focusMaximized` are synced to URL params (`?clip=ID&max=1`) via `goto(..., { replaceState: true, noScroll: true, keepFocus: true })`.
- **Server hook**: `frontend/hooks.server.ts` redirects legacy `/?clipId` URLs to `/view?clip=clipId` (302).
- **Dev proxy**: `vite.config.js` proxies `/api` to `http://backend.local.localhost:8000` for local replica calls.
- **`test.mo` and `backend/test.wasm`** exist but are experimental/standalone; do not confuse with `frontend/tests/`.
- **CI**: GitHub Actions runs in Nix (`nix-build`). Cachix cache `kopicat`. See `.github/workflows/ci.yml`.
- **Nix environment**: `default.nix` + `shell.nix` define the dev shell (Motoko compiler, vessel, didc, Node.js, pnpm, ImageMagick).

## License
This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

## Skills
`load` skills from `.agents/skills/` for domain-specific guidance:
- **motoko** — Motoko pitfalls, stable types, mo:core standard library
- **stable-memory** — persisting state across canister upgrades
- **certified-variables** — certified data API, certificate validation
- **canhelp** — querying canister interfaces by canister ID
