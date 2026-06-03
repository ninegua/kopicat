# KopiCat

**Secure clipboard sharing via simple links.**

> Share text, code, and secrets — end-to-end encrypted, no tracking.

![License](https://img.shields.io/badge/license-MIT-blue)
![ICP](https://img.shields.io/badge/Internet%20Computer-100%25-green)
![Svelte](https://img.shields.io/badge/Svelte-5-ff3e00)
![ci](https://github.com/ninegua/kopicat/actions/workflows/ci.yml/badge.svg?branch=master)

## Features

- 🔐 **AES-256-GCM** client-side encryption with PBKDF2 key derivation
- 🌐 **Fully decentralized** — single ICP canister, no central servers
- 📱 **QR code sharing** — send clips to nearby devices
- ⏳ **Auto-expiry** — configurable TTL with lazy cleanup
- 🔥 **Burn after read** — optional one-time delivery
- 💾 **IndexedDB** persistence for saved clips
- 📡 **Receive mode** — generate a receiving clip and let others send to you
- 🔍 **SHA-256 verification** — frontend computes hash, backend validates integrity

## Quick Start

```bash
icp deploy            # deploy backend + frontend
pnpm dev              # start frontend dev server (proxies /api to local replica)
pnpm test             # run tests
pnpm check            # type check
```

## Architecture

- **Backend**: Motoko `persistent actor` with `create_clip` (update), `get_clip` (query), and `get_stats` (admin-only)
- **Frontend**: Svelte 5 SPA, static build → `dist/` → asset canister via `icp sync`
- **Crypto**: AES-256-GCM; ciphertext = `salt(16) + iv(12) + ciphertext`; password stays in URL fragment

## Security

- Password never leaves the browser — stored in `#fragment`, never sent to server
- Canister stores only encrypted blobs; plaintext never exposed on-chain
- SHA-256 checksum verified on `create_clip` to detect corruption
- `get_stats` restricted to canister creator

## Project Structure

```
backend/main.mo          # Motoko persistent actor — clip CRUD + sha256 verification
frontend/
├── lib/
│   ├── api/             # ICP client, IndexedDB store, Svelte writables
│   ├── crypto.ts        # AES-256-GCM + SHA-256
│   └── components/      # Svelte 5 runes
├── routes/              # /, /send, /share, /view, /list, /faq
└── service-worker.ts    # Workbox PWA
```

## Contributing

PRs welcome.

## License

[MIT](LICENSE)
