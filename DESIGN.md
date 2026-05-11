# DESIGN.md — KopiCat (Text Sharing via Clipboard)

## System Architecture

```
┌──────────────┐     ICP Agent       ┌───────────────────────────┐
│   Browser    │ ──────────────────▶ │  Single ICP Canister      │
│   (Svelte)   │                     │  (Motoko + mo:server)     │
│              │                     │                           │
│  PBKDF2+     │   Candid (Actor)    │  create_clip (update)     │
│  AES-GCM     │ ──────────────────▶ │  get_clip (query)         │
│  in-browser  │                     │  get_stats (query)        │
│              │                     │  http_request─▶HTML/CSS/JS│
└──────────────┘                     └───────────────────────────┘
```

- **Single Canister**: One Motoko canister handles both HTTP serving (via `mo:server`) and clip logic (`persistent actor`)
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

- **Key Derivation**: `@scure/lib` PBKDF2, 100k iterations, SHA-256
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

The canister uses `mo:server` to route all requests — static assets, and the Svelte app shell. Clip operations are exposed as Candid methods called directly by the frontend via the `@icp-sdk/core` Actor pattern.

#### HTTP Routes (via `mo:server`) — Static Assets

| Path | Handler | Description |
|---|---|---|
| `/` | `StaticAsset("/index.html")` | Serves the Svelte app shell |
| `/:path` | `StaticAsset(path)` | Serves JS/CSS assets if the path exists |
| `/*` | `StaticAsset("/index.html")` | Fallback to index.html if the path doesn't exist |

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

**get_clip** — Retrieves a clip by ID using a query call (no consensus needed). Checks for expiration before returning. If `burn_after_read` is true, the clip is deleted after retrieval.

**Error handling** — Candid `Result` types return `#ok(value)` for success or `#err(message)` for errors. The frontend wraps these in user-friendly error messages.

## User Experience Flow

### Page Overview

| Route | Purpose | State |
|---|---|---|
| `/` | Home / Idle | Shows IdleView (paste target or manual input entry point) |
| `/edit` | Create or Edit a clip | CreateForm with text, password, TTL, burn-after-read options |
| `/view?clip=xxx#password` | View a shared clip | DecryptForm → ResultView (auto-decrypts if password in hash) |
| `/list` | Saved clips gallery | GridView showing locally saved clips |

### Entry Points

The app has three entry points, each initializing different state:

1. **Home (`/`)** — Default state. Shows an empty paste target. Detects clip ID in query string and redirects to `/view`.
2. **Shared link (`/clipId#password`)** — User receives a share URL with clip ID as query param and password as URL fragment (never sent to server). App fetches the encrypted clip, then shows the decrypt form. If the password is in the hash, it auto-decrypts.
3. **Web Share Target (`/?share=1&text=...`)** — Browser's Web Share API delivers shared text/URL/title as GET params. App pre-fills the create form.

### Create Flow

```
Home (/) ──▶ Paste text or tap to input
                        │
                        │ Edit (/edit)
                        │
                        ▼
              Fill: text, TTL, burn-after-read, save local
                        │
                        ▼
              Generate clipId (3 random words)
                        │
                        ▼
              Encrypt client-side → Candid actor call (create_clip)
                        │
                        ├── SaveLocal ──▶ LocalStorage
                        │
                        ├── ShowShareModal ──▶ User copies QR/link
                        │ 
                        └─▶ List (/list)
```

**Key behaviors:**

- Password is a random 60-bit key auto generated
- User can't skip sharing
- "Save a local copy" persists the clip to local storage for later access
- After creation, user is always sent to `/list` to see their saved clip gallery
- Share modal includes QR code and full URL (clipId as query, password as hash fragment)

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
                           ├──────▶ Failed? ------┘
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
- ResultView shows: decrypted text, copy button, save checkbox, done/dismiss

### Saved Clips Flow

```
List (/list) ──▶ GridView of locally saved clips
                    │
                    ├───▶ Edit in place ───▶ Save? (Yes/Undo)
                    │
                    ├───▶ Zoom to full screen ───▶ Edit or Preview
                    │
                    ├───▶ Share button ───────▶ /edit?edit=xxx&text=yyy
                    │                                │
                    │                                ▼
                    │                          Fill/modify text, password, TTL
                    │                                │
                    │                                ▼
                    │                           Create flow
                    │
                    │
                    ├──▶ "New clip" button ──▶ New clip created and added to list
                    │
                    └──▶ "New receive" button ──▶ /send
```

**Key behaviors:**

- Saved clips are stored in local storage (separate from canister)
- Share a saved clip: redirects to /edit with text prefilled
- New clip button on /list provides access to create a new clip
- New receive button on /list provides access to create a new receiving clip

### URL Formats

| Format | Meaning |
|---|---|
| `/` | Home — idle / paste target |
| `/?clipId#password` | Shared clip — query = lookup key, hash = password |
| `/?share=1&text=...&url=...` | Web Share Target delivery |
| `/edit` | Share/create a new clip |
| `/edit?from=xxx` | share existing clip (prefilled) |
| `/view?clip=xxx#password` | View shared clip |
| `/list` | Gallery of saved clips |

### State Management

All page state lives in a single Svelte store (`$lib/api/store.ts`):

```
clipId: string | null       — Current clip being viewed/created
password: string            — Current password input or auto-extracted hash
decryptedText: string | null — Successfully decrypted content
clip: Clip | null           — Encrypted blob from canister
error: string | null        — Error message for display
loading: boolean            — Loading indicator state
shareUrl: string | null     — Generated share URL for modal
showShareModal: boolean     — Whether share modal is open
prefillText: string | null  — Pre-filled text from share params
createMode: 'share' | 'edit' — Which mode the create form is in
editClipId: string | null   — Clip being edited
localClips: LocalClip[]     — Saved clips from local storage
```

Pages subscribe to this store to react to state changes. Navigation between pages updates the store, and each page's `onMount` initializes state from its URL.

- Backend will always route this URL to the default app page (index.html).
- The clip id (e.g., `violet-dolphin-canyon`) is the URL path.
- The password is the URL fragment (after `#`), never sent to the server.
- If no path is present (`/`), the page shows the create form.
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
│  │  [ ] Save local     [ ] Burn after read   │  │
│  │  [Create]           Expiry: [1 hour ▼]    │  │
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
- Visiting `/` shows the create form; the result area is hidden
- Visiting `/violet-dolphin-canyon#mypassword` fetches the clip via the clip id ("violet-dolphin-canyon") and auto-decrypts using the password from the fragment

### Project Structure

```
canister/
└── backend.mo              # Main canister — persistent actor + HTTP server + clip logic
src/
├── lib/
│   ├── crypto.ts           # encrypt, decrypt, generatePasscode
│   └── words.ts            # word list (~7776 words)
├── routes/
│   └── +page.svelte        # root page (create + view)
└── app.html                # entry point
vessel.dhall                # Canister dependencies
package-set.dhall           # Package resolution (pin versions)
Makefile                    # Backend build (moc compiler + vessel)
package.json                # Frontend dependencies
```

- **Single Canister**: `canister/backend.mo` — serves HTTP static assets, exposes Candid clip API in one canister
- **Frontend**: Svelte app built to `dist/`, uses `@icp-sdk/core` Actor pattern to call canister methods directly
- **Build**: `make backend` compiles Motoko source to `.wasm` using `vessel` for dependency resolution; `pnpm build` compiles the Svelte app to `dist/`
- **Canister API**: Candid methods (`create_clip`, `get_clip`, `get_stats`) called via `@icp-sdk/core/agent` Actor — the `mo:server` `http_request` handler serves only static assets

### TTL / Expiry Strategy

- **Hard expiry**: `get_clip` query call checks `expires_at` before returning data
- **Lazy cleanup**: At the end of each clip `create_clip` update call, expired clips are removed from the `clips` map. This keeps storage lean without needing periodic timers or background tasks.
- Default expiry: 15 minutes
- Options: 1 min, 5 min, 15 min, 1 hour, 1 day, never

### Backend Dependencies

**vessel.dhall**:
```dhall
{ dependencies = [ "core", "server" ], compiler = Some "1.5.0" }
```

- **mo:core** — modern Motoko standard library (`Map`, `Text`, `Nat`, `Result`, etc.)
- **mo:server** — HTTP server for serving static assets
- **Makefile** — orchestrates the build, offering both `make backend` and `make frontend` commands.

Package versions are pinned via `package-set.dhall` (or the upstream vessel package set), ensuring reproducible builds.

### Frontend Dependencies

- **Svelte** — UI framework (single page, no routing needed)
- **@icp-sdk/core** — ICP Actor client for Candid method calls (`Actor`, `HttpAgent`, `IDL`)
- **qrcode** — client-side QR code generation
- **@scure/lib** — PBKDF2 key derivation (client-side)
- **Web Crypto API** — `crypto.subtle` for AES-GCM encryption/decryption

### Deployment

Deployed to the Internet Computer via `icp` CLI and `icx-asset`:

```bash
# Start local replica for development
icp network start -d

# Build backend (Motoko → .wasm) and frontend assets
make backend
make frontend

# Deploy the canister (Motoko backend + Candid API)
icp deploy

# Upload frontend assets to the deployed canister
icp sync

```

- **Single canister**: Serves the Svelte frontend via `http_request` and exposes the clip API via Candid methods — the frontend uses `@icp-sdk/core` Actor pattern for direct canister communication
- **Zero infrastructure**: No VPS, no database server, no load balancer — everything runs on ICP
- **Automatic persistence**: `persistent actor` handles data durability across upgrades — no backups needed
- **Global CDN**: ICP subnets serve requests from nodes worldwide
- **Upgrade**: Re-run `make backend`, `pnpm build`, `icp deploy`, then `icx-asset` to deploy new code and update assets

### Configuration

Configuration is in `icp.yaml`, `vessel.dhall`, and `package-set.dhall` — no `dfx.json` needed.

**vessel.dhall** (single canister):
```dhall
{ dependencies = [ "core" ], compiler = Some "1.5.0" }
```

**package-set.dhall** overrides specific package versions for reproducible builds. `vessel install` reads both files and populates `.vessel/` with resolved source code.

**Frontend Environment Variables**:

| Variable | Default | Description |
|---|---|---|
| `VITE_CANISTER_ID` | — | The canister ID to connect to (required for production) |
| `VITE_AGENT_HOST` | `https://icp-api.io` | The ICP host URL (use `http://localhost:4943` for local development) |
