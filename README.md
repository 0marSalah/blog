# blog

Not really a blog. It's a small experiment to see what it actually takes for
a plain React app to talk to Wallet Attached Storage -- identity, login,
reading, writing -- on the way to eventually building an ActivityPub reader.
The full story of what got tried and why is in
[ARCHITECTURE.md](./ARCHITECTURE.md).

## What it does

Register with a passphrase, get a real identity and a Space to write into.
Log back in later with the same passphrase, any browser, and you're the
same author again. Publish a post, it's saved for real on the server.
Anyone can read what's published -- no login needed for that, only for
writing.

## Running it

You need a WAS server running first. This app is pinned to
`http://localhost:3002` (see `src/app.config.ts`), so start
`was-space-server` on that exact port:

```bash
SERVER_URL='http://localhost:3002' PORT=3002 pnpm dev
```

Then, here:

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Lint

```bash
pnpm lint
```
