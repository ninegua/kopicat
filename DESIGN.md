# DESIGN.md — KopiCat (Text Sharing via Clipboard)

## System Architecture

```
┌──────────────┐     ICP Agent       ┌───────────────────────────┐
│   Browser    │ ──────────────────▶ │  Single ICP Canister      │
│  (SvelteKit) │                     │  (Motoko persistent actor)│
│              │                     │                           │
│  PBKDF2+     │   Candid (Actor)    │  create_clip (update)     │
│  AES-GCM     │ ──────────────────▶ │  get_clip (query)         │
│  in-browser  │                     │  get_stats (query)        │
│              │                     │                           │
└──────────────┘                     └───────────────────────────┘
```

- **Single Canister**: One Motoko `persistent actor` handles clip storage and Candid API. Static assets are served separately (e.g., via `icp sync` or a dedicated asset canister).
- **Storage**: All data persisted in stable memory via Motoko `persistent` keyword
- **End-to-end encryption**: Encryption remains client-side; the canister stores only encrypted blobs
- **Frontend Communication**: The frontend uses `@icp-sdk/core` Actor pattern to call Candid methods directly

## Key Design Decisions

### Encryption (Client-Side, Server has no knowledge)

```
Password ──▶ PBKDF2(Salt) ──▶ AES-256-GCM Key
                                  │
                                  ▼
                              Encrypt(Plaintext)
                                  │
                                  ▼
                                 blob
                                  │
                                  ▼                                
Clipboard + Password ──▶ Decrypt(blob) ──▶ Plaintext
```

- **Key Derivation**: Web Crypto API PBKDF2, 100k iterations, SHA-256
- **Cipher**: AES-GCM-256 (authenticated encryption)
- **Blob format** (base64 encoded): `salt(16 bytes) + iv(12 bytes) + ciphertext + auth_tag(16 bytes)`
- Server stores only the base64 blob — it never sees plaintext

### Clipboard System

- **Format**: `word-word-word` (e.g., `violet-dolphin-canyon`)
- **Entropy**: 3 words from a ~7776-word list = ~44 bits of entropy
- Generated client-side, displayed to user before sending
- Both sender and receiver must type the same clip id to open a clip
- Clip id are NOT the encryption key — they are merely a human-friendly lookup key
- Encryption key is auto generated (about 60 bit entropy).

### Data Model (Motoko persistent actor)

The canister uses Motoko `Map` (B-tree, stable) from `mo:core`. No `stable` keyword needed — `persistent actor` persists all `let`/`var` declarations automatically.

#### `Clip` record type

```motoko
type Clip = {
  blob : Text;
  created_at : Int;
  expires_at : Int;
  burn_after_read : Bool;
};
```

#### Storage layout

| Map / Variable | Purpose |
|---|---|
| `clips` : `Map.Map<Text, Clip>` | Main clip storage, keyed by clipboard string |

All `let` and `var` declarations are stable by default in `persistent actor`. Transient data uses `transient var`.

### Canister Methods

The backend is a plain Motoko `persistent actor` exposing Candid methods. The frontend is a SvelteKit static app built to `dist/` and deployed as static assets.

#### Candid Methods (Frontend Communication)

The frontend uses `@icp-sdk/core/agent` to create an Actor that calls these Candid methods directly over the ICP protocol:

| Method | Type | Arguments | Return Type | Description |
|---|---|---|---|---|
| `create_clip` | update | `Input` | `Result<Text, Text>` | Create a new clip. Returns `#ok(id)` on success or `#err(message)` on failure. |
| `get_clip` | query | `Text` (clip ID) | `?Clip` | Retrieve a clip. Returns `null` if not found or expired. |
| `get_stats` | query | — | `Stats` | Get canister statistics (total clips, available clips, max TTL). |

#### Candid Type Definitions

```motoko
type Input = {
  id : Text;
  blob : Text;
  expires_after: ?Nat;
  burn_after_read : Bool;
};

type Clip = {
  blob : Text;
  created_at : Int;
  expires_at : Int;
  burn_after_read : Bool;
};

type Stats = {
  max_seconds_to_live: Nat;
  total_clips_created: Nat;
  available_clips: Nat;
};
```

**create_clip** — Creates a new clip with the encrypted blob. The clip ID is provided by the frontend (3-word format like `violet-dolphin-canyon`). The method validates blob size, expiration time, and prevents duplicate clip IDs.

**get_clip** — Retrieves a clip by ID using a query call (no consensus needed). Checks for expiration before returning. Note: `burn_after_read` is stored but not enforced by the backend (query calls cannot mutate state); deletion would require an update call or frontend coordination.

**Error handling** — Candid `Result` types return `#ok(value)` for success or `#err(message)` for errors. The frontend wraps these in user-friendly error messages.

## User Experience Flow

### Page Overview

| Route | Purpose | State |
|---|---|---|
| `/` | Home / Idle | Shows IdleView (paste target or manual input entry point) |
| `/share` | Create or Edit a clip | CreateForm with text, password, TTL, burn-after-read options |
| `/share?send=xxx` | Send to a receiving clip | CreateForm prefilled for sending to a specific receiving clip ID |
| `/view?clip=xxx#password` | View a shared clip | DecryptForm → ResultView (auto-decrypts if password in hash) |
| `/list` | Saved clips gallery | GridView showing locally saved clips |
| `/send?clipId#password` | Show a receiving clip | IdleView in send mode — displays QR code and URL for sender to scan |

### Entry Points

The app has four entry points, each initializing different state:

1. **Home (`/`)** — Default state. Shows an empty paste target. Detects clip ID in query string and redirects to `/view`.
2. **Shared link (`/?clipId#password`)** — User receives a share URL with clip ID as query param and password as URL fragment (never sent to server). App fetches the encrypted clip, then shows the decrypt form. If the password is in the hash, it auto-decrypts.
3. **Web Share Target (`/?share=1&text=...`)** — Browser's Web Share API delivers shared text/URL/title as GET params. App pre-fills the create form.
4. **Receive link (`/send?clipId#password`)** — A receiving clip URL. Shows the QR code and link that a sender can scan or visit to deliver a clip to this receiver.

### Create Flow

```
Home (/) ──▶ Paste text or tap to input
                        │
                        │ Edit (/share)
                        │
                        ▼
              Fill: text, TTL, burn-after-read, keep local
                        │
                        ▼
              Generate clipId (3 random words)
                        │
                        ▼
              Encrypt client-side → Candid actor call (create_clip)
                        │
                        ├── KeepLocal ──▶ LocalStorage
                        │
                        ├── ShowShareModal ──▶ User copies QR/link
                        │ 
                        └─▶ List (/list)
```

**Key behaviors:**

- Password is a random key auto generated (~65 bits when using 11 characters from a 58-char charset)
- User can't skip sharing
- "Keep a local copy" persists the clip to local storage for later access
- After creation, user is sent back to `/list` (or previous page) to see their saved clip gallery
- Share modal includes QR code and full URL (`/?clipId#password`)

### Read Flow (Shared Clip)

```
User opens shared URL ──▶ Home (/) detects clipId in query
                            │
                            ▼
                    Redirect to /view?clip=xxx#password (replaceState)
                            │
                            ▼
                    Candid actor call (get_clip)
                            │
                    ┌───────┴────────┐
                    │                │
            Password in hash     No password
                    │                │
                    ▼                ▼
              Auto-decrypt     Show DecryptForm (input field)
                    │                │            ▲
                    └──────┬────── Decrypt        │
                           │                      │   
                           ├──────▶ Failed? ──────┘
                           ▼          
                        Success?
                           │
                           ▼
                      ResultView (copy, save, share)
```

**Key behaviors:**

- Password is extracted from URL hash fragment (`#password`) — never sent to server
- If hash is empty or missing, the DecryptForm is shown for manual password entry
- Auto-decrypt only triggers if both clip blob and password are present
- Failed decryption shows inline error, returns to DecryptForm for retry
- ResultView shows: decrypted text, copy button, save to collection, done/dismiss

### Receive Flow

The receive flow lets a user generate a "receiving clip" — a QR code and URL that a sender can scan or visit to deliver an encrypted message directly to the receiver's device.

```
Home (/) ──▶ "Or receive?" clicked
                │
                ▼
        newReceivingClip() ──▶ generates clipId + password
                │
                ▼
        Stores in localStorage with receiving=true
                │
                ▼
        Redirect to /list with new clip focused
                │
                ▼
        GridView shows QR code + URL (/send?clipId#password)
                │
                ▼
        Sender scans QR / visits URL ──▶ pastes text ──▶ create_clip(clipId)
                │
                ▼
        GridView polls canister every 5s for receiving clips
                │
                ▼
        Remote clip found ──▶ decrypt(remoteClip.blob, password)
                │
                ▼
        Update localStorage: text=decrypted, receiving=false
```

**Key behaviors:**

- Receiving clips are stored in `localStorage` with `receiving: true`
- The receiving URL format is `/send?clipId#password` (clipId in query, password in hash)
- GridView sets up a polling timer (every 5 seconds) that fetches all receiving clips from the canister
- On successful fetch and decrypt, the clip's `text` is replaced with the decrypted content and `receiving` is set to `false`
- On decryption failure (wrong password), the clip text is replaced with the error message, `receiving` stays `true`, and a "Try again" button generates a new receiving clip with a fresh ID and password
- Collapsed receiving clips show "Yet to receive"; failed ones show "Failed to receive"
- Expanded receiving clips display a QR code canvas and a copyable URL button
- Multiple receiving clips are polled independently

### Send Flow (to a receiving clip)

```
Sender opens /send?clipId#password
                │
                ▼
        IdleView in "send" mode
                │
                ▼
        Sender pastes text (Ctrl+V, clipboard, or click)
                │
                ▼
        Redirect to /share?send=clipId
                │
                ▼
        CreateForm with prefill text
                │
                ▼
        Encrypt + create_clip(id=clipId) ──▶ receiver polls and decrypts
```

**Key behaviors:**

- The `/send` page is the sender's entry point for delivering to a specific receiving clip
- IdleView shows "Send to {clipId}" and accepts paste/clipboard input
- After input, the sender is redirected to `/share?send=clipId` to review and share
- The clip is encrypted and uploaded with the exact ID from the receiving URL
- The receiver's polling loop picks it up, decrypts it, and updates local storage

### Saved Clips Flow

```
List (/list) ──▶ GridView of locally saved clips
                    │
                    ├───▶ Edit in place ───▶ Save? (Yes/Undo/Cancel)
                    │      (scratchpad editing)
                    │
                    ├───▶ Maximize to full screen ───▶ Edit or Preview
                    │
                    ├───▶ Share button ───────▶ /share?from=xxx
                    │                                │
                    │                                ▼
                    │                          Fill/modify text, password, TTL
                    │                                │
                    │                                ▼
                    │                           Create flow
                    │
                    ├──▶ "New clip" button ──▶ New scratch clip created and added to list
                    │
                    └──▶ "New receive" button ──▶ Generates receiving clip, focused in grid
```

**Key behaviors:**

- Saved clips are stored in `localStorage` under the key `copycat_clips` (separate from canister)
- In-place editing uses a scratchpad (`purpose: 'scratch'`) so changes aren't persisted until explicitly saved
- Modified clips show a visual pulse indicator
- Share a saved clip: redirects to `/share?from=clipId` with text prefilled
- Delete shows a snackbar with a 5-second undo timer
- New clip button creates a blank scratch clip on `/list`
- New receive button generates a receiving clip (`receiving: true`) and focuses it in the grid

### URL Formats

| Format | Meaning |
|---|---|
| `/` | Home — idle / paste target |
| `/?clipId#password` | Shared clip (legacy) — server hook redirects to `/view?clip=...` |
| `/?share=1&text=...&url=...` | Web Share Target delivery |
| `/share` | Share/create a new clip |
| `/share?from=xxx` | Share existing saved clip (prefilled) |
| `/share?send=xxx` | Send to a specific receiving clip ID |
| `/share?chooser=true` | Browse saved clips to choose one |
| `/view?clip=xxx#password` | View shared clip |
| `/list` | Gallery of saved clips |
| `/list?clip=xxx` | Gallery with a specific clip focused |
| `/send?clipId#password` | Show receiving clip QR/link for sender to scan |

### State Management

State is split across two Svelte stores (`$lib/api/store.ts`):

**`clipState`** — Core clip viewing/creation state:
```
clipId: string | null       — Current clip being viewed/created
decryptedText: string | null — Successfully decrypted content
prefillText: string | null  — Pre-filled text from share params or saved clip
clipPass: string | null     — Password extracted from URL hash for auto-decrypt
```

**`modalState`** — Modal overlays:
```
showModal: 'share' | 'success' | null — Which modal is open
shareUrl: string | null               — Generated share URL for ShareCard
successMessage: string | null         — Message for SuccessCard (e.g., send confirmation)
```

**`headerClipCount`** — Header badge counts:
```
total: number   — Total visible clips in grid
unsaved: number — Number of clips with scratchpad edits
```

**`localStore`** (`$lib/api/local-store.ts`) — `localStorage` persistence:
- Key: `copycat_clips`
- Stores `LocalClip[]` with fields: `id`, `text`, `saved_at`, `last_modified?`, `receiving?`
- Scratchpad (`purpose: 'scratch'`) holds unsaved edits in memory

Pages subscribe to these stores to react to state changes. Navigation between pages updates the store, and each page's `onMount` initializes state from its URL.

- The password is the URL fragment (after `#`), never sent to the server.
- If no path is present (`/`), the page shows the idle view.
- When a URL with a clip id is opened, the app automatically fetches and decrypts the clip.

### Pages

#### UI for main workflows

Create a new clip to share
```
┌─────────────────────────────────────────────────┐
│                    Home                         │
│  ┌───────────────────────────────────────────┐  │
│  │  Create New                               │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │ Text...                             │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  [ ] Keep local     [ ] Burn after read   │  │
│  │  [Share]            Expiry: [1 hour ▼]    │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

When "Share Link" is clicked, a modal appears:

```
┌─────────────────────────────────────────────────┐
│              Share Link                  [✕]    │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │              [QR Code]                    │  │
│  │                                           │  │
│  │  https://kopicat.cc/violet-dolphin-c      │  │
│  │  anyon#secure-p@ssw0rd                    │  │
│  │                                           │  │
│  │  [Copy Link]                              │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

View a shared clip

```
┌─────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────┐  │
│  │  Decrypted Result                         │  │
│  │                          [save]  [copy]   │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │ text text text text text text       │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```


- The modal displays a QR code (generated client-side) encoding the full shareable URL
- The full URL (including the password fragment) is displayed and can be copied to the system clipboard via the "Copy Link" button or the button below the QR code
- "Copy Link" uses the Clipboard API (`navigator.clipboard.writeText`) to copy the URL to the OS clipboard
- Visiting `/` shows the idle view; creation happens after paste or click
- Visiting `/?violet-dolphin-canyon#mypassword` redirects to `/view?clip=violet-dolphin-canyon#mypassword`, fetches the clip, and auto-decrypts using the password from the fragment

### Project Structure

```
backend/
├── main.mo                 # Main canister — persistent actor with clip Candid API
└── test.mo                 # Test / scratch file (path matching experiments)
frontend/
├── lib/
│   ├── api/
│   │   ├── client.ts       # Wrapper around ICP actor (createClip, fetchClip)
│   │   ├── local-store.ts  # localStorage CRUD for saved/receiving clips
│   │   └── store.ts        # Svelte stores (clipState, modalState, headerClipCount)
│   ├── components/
│   │   ├── IdleView.svelte
│   │   ├── CreateForm.svelte
│   │   ├── DecryptForm.svelte
│   │   ├── ResultView.svelte
│   │   ├── GridView.svelte
│   │   ├── ShareCard.svelte
│   │   ├── SuccessCard.svelte
│   │   ├── ClipDisplay.svelte
│   │   ├── CodeEditor.svelte
│   │   ├── Header.svelte
│   │   └── Footer.svelte
│   ├── icp/
│   │   ├── actor.ts        # @icp-sdk/core agent setup + Actor creation
│   │   └── types.ts        # Clip, ClipInput types
│   ├── crypto.ts           # encrypt, decrypt, generatePassword (Web Crypto API)
│   ├── words.ts            # word list (~7776 words)
│   └── qr.ts               # QR code rendering helper
├── routes/
│   ├── +page.svelte        # Home (idle view)
│   ├── +layout.svelte
│   ├── edit/+page.svelte   # Create / edit clip
│   ├── view/+page.svelte   # View shared clip
│   ├── list/+page.svelte   # Saved clips gallery
│   └── send/+page.svelte   # Show receiving clip for sender to scan
├── tests/                  # Vitest tests (happy-dom)
└── app.html                # SvelteKit app template
vessel.dhall                # Canister dependencies
package-set.dhall           # Package resolution (pin versions)
Makefile                    # Backend build (moc compiler + vessel)
package.json                # Frontend dependencies
svelte.config.js            # SvelteKit config (static adapter, CSP)
vite.config.js              # Vite config (SvelteKit plugin, PWA, proxy)
```

- **Backend**: `backend/main.mo` — plain persistent actor exposing Candid clip API
- **Frontend**: SvelteKit app with static adapter, built to `dist/`, uses `@icp-sdk/core` Actor pattern
- **Build**: `make backend` compiles Motoko to `.wasm`; `make frontend` compiles generated assets and the SvelteKit app to `dist/`
- **Canister API**: Candid methods (`create_clip`, `get_clip`, `get_stats`) called via `@icp-sdk/core/agent` Actor

### TTL / Expiry Strategy

- **Hard expiry**: `get_clip` query call checks `expires_at` before returning data
- **Lazy cleanup**: At the end of each `create_clip` update call, expired clips are removed from the `clips` map. This keeps storage lean without needing periodic timers or background tasks.
- Default expiry in UI: 1 hour (3600 seconds)
- UI options: 1 minute, 15 minutes, 1 hour, 1 day, 7 days
- Backend max TTL: 7 days (configurable via init arg `max_seconds_to_live`)

### Backend Dependencies

**vessel.dhall**:
```dhall
{ dependencies = [ "core" ], compiler = Some "1.5.0" }
```

- **mo:core** — modern Motoko standard library (`Map`, `Text`, `Nat`, `Result`, `Time`, `Option`, etc.)
- **Makefile** — orchestrates the build, offering `make backend`, `make frontend`, and `make assets` commands.

Package versions are pinned via `package-set.dhall` (or the upstream vessel package set), ensuring reproducible builds.

### Frontend Dependencies

- **Svelte 5 + SvelteKit 2** — UI framework with static adapter (`@sveltejs/adapter-static`)
- **@icp-sdk/core** — ICP Actor client for Candid method calls (`Actor`, `HttpAgent`, `Principal`, `Ed25519KeyIdentity`)
- **qrcode** — client-side QR code generation
- **Web Crypto API** — `crypto.subtle` for PBKDF2 key derivation and AES-GCM encryption/decryption
- **marked** — Markdown rendering in clip previews
- **highlight.js** — Syntax highlighting in code editor
- **codejar** — Lightweight code editor component
- **@floating-ui/dom** — Dropdown positioning for TTL selector
- **vite-plugin-pwa** — Service worker / PWA support (inject manifest strategy)
- **workbox-* ** — Precaching, routing, and strategies for service worker

### Deployment

Deployed to the Internet Computer via `icp` CLI:

```bash
# Build backend (Motoko → .wasm + .did)
make backend

# Build frontend assets
make frontend

# Deploy the canister (Motoko backend + Candid API)
icp deploy

# Upload frontend assets to the deployed canister
icp sync
```

- **Static frontend**: The SvelteKit app is built to `dist/` with the static adapter and synced to the canister via `icp sync`
- **Backend only exposes Candid API**: The Motoko actor does not serve HTTP assets directly
- **Zero infrastructure**: No VPS, no database server, no load balancer — everything runs on ICP
- **Automatic persistence**: `persistent actor` handles data durability across upgrades — no backups needed
- **Global CDN**: ICP subnets serve requests from nodes worldwide
- **Upgrade**: Re-run `make backend`, `make frontend`, `icp deploy`, then `icp sync` to deploy new code and update assets

### Configuration

Configuration is in `icp.yaml`, `vessel.dhall`, `package-set.dhall`, `svelte.config.js` and `vite.config.js`.

**icp.yaml**
- Use custom script `make backend` to build backend.
- Set vite environment variables to pass canister id (both development and production environment), which is required to building frontend.
- Use `asset-canister@v2.1.0` for frontend, which is also built by custom script `make frontend`.

**vessel.dhall** (single canister):
```dhall
{ dependencies = [ "core" ], compiler = Some "1.5.0" }
```

**package-set.dhall** overrides specific package versions for reproducible builds. `vessel install` reads both files and populates `.vessel/` with resolved source code.

**svelte.config.js**:
- Uses `@sveltejs/adapter-static` with fallback `200.html`
- CSP in production: `default-src 'self'`, `connect-src 'self' https://icp-api.io`, etc.
- Custom `files` paths pointing to `frontend/` directory

**vite.config.js**:
- Proxy: `/api` → `http://backend.local.localhost:8000` (for local dev)
- VitePWA with `injectManifest` strategy using `frontend/service-worker.ts`

**Frontend Environment Variables**:

| Variable | Default | Description |
|---|---|---|
| `VITE_CANISTER_ID` | — | The canister ID to connect to (required for production) |
| `VITE_AGENT_HOST` | `https://icp-api.io` | The ICP host URL (use `http://localhost:4943` for local development) |
