# KopiCat

**Secure clipboard sharing via simple links.**

> Share text, code, and secrets — end-to-end encrypted, no tracking.

![License](https://img.shields.io/badge/license-MIT-blue)
![ICP](https://img.shields.io/badge/Internet%20Computer-100%25-green)
![Svelte](https://img.shields.io/badge/Svelte-5-ff3e00)
![ci](https://github.com/ninegua/kopicat/actions/workflows/ci.yml/badge.svg?branch=master)

## Features

- 🔐 **End-to-end encryption** — AES-256-GCM with client-side key derivation (PBKDF2)
- 🌐 **Decentralized** — runs entirely on the Internet Computer, no central servers
- 📱 **QR code sharing** — send clips to nearby devices via scanned QR codes
- ⏳ **Auto-expiry** — configurable TTL (1 min → 7 days) with automatic cleanup
- 🔥 **Burn after read** — optional one-time delivery for sensitive content
- 💾 **Persistent storage** — clips saved locally in browser via IndexedDB
- 📡 **Receive mode** — generate a receiving clip and let others send to you
- 🎨 **Markdown & syntax highlighting** — code-aware clip display

## Usage

### Creating a clip

1. Open the app or paste text onto the home screen
2. Optionally edit: set TTL, enable "burn after read", keep a local copy
3. A **clip ID** (e.g., `violet-dolphin-canyon`) and **password** are generated
4. Share the URL (`/?clipId#password`) — the password is in the URL fragment and **never sent to the server**

### Receiving a clip

1. On the home screen, click **"Or receive?"**
2. A **receiving clip** is generated with a QR code and URL
3. The sender scans the QR code or visits the `/send?clipId#password` URL
4. Paste the text they send — your app polls the canister and auto-decrypts the result

## Architecture

```
┌──────────────┐        HTTPS        ┌───────────────────────────┐
│              │ ──────────────────▶ │  Asset Canister           │
│              │                     │  (Frontend HTML/JS)       │
│              │                     └───────────────────────────┘
│   Browser    │                     ┌───────────────────────────┐
│  (SvelteKit) │                     │  Single ICP Canister      │
│              │     Canister RPC    │  (Motoko persistent actor)│
│              │ ──────────────────▶ │  create_clip (update)     │
│              │                     │  get_clip (query)         │
└──────────────┘                     └───────────────────────────┘
```

**Key decisions:**

- **Client-side encryption** — the canister stores only encrypted blobs; it never sees plaintext
- **Stable memory persistence** — `persistent actor` auto-persists all state across upgrades
- **Static frontend** — SvelteKit app built to `dist/`, deployed as static assets via `icp sync`

### Development

All development was done in [nix-shell](https://nixos.org/nix), using IC development kit from [ic-nix](https://github.com/ninegua/ic-nix).

```bash
# Deploy the backend canister
icp deploy backend

# Start the frontend dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm check
```

## Project Structure

```
backend/
├── main.mo                 # Motoko persistent actor — clip CRUD API
frontend/
├── lib/
│   ├── api/
│   │   ├── client.ts       # ICP Actor client (createClip, fetchClip)
│   │   ├── local-store.ts  # IndexedDB persistence for saved clips
│   │   └── store.ts        # Svelte writable stores
│   ├── crypto.ts           # AES-256-GCM encryption/decryption
│   ├── components/         # Svelte 5 components (runes)
│   └── routes/             # SvelteKit pages
vessel.dhall                # Motoko dependencies (mo:core)
Makefile                    # Backend build (moc, didc)
package.json                # Frontend dependencies (pnpm)
```

## Security Notes

- **Password is never transmitted** — it's stored in the URL hash fragment (`#password`)
- **Encryption is client-side only** — the canister sees only encrypted blobs
- **Key derivation** uses PBKDF2 with 100k iterations and SHA-256
- **Burn after read** is best-effort (query calls cannot mutate state)
- **Clip IDs** are human-readable 3-word phrases (~44 bits of entropy)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
