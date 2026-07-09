---
name: run-aura-stories
description: Build, launch, and smoke-test the Aura Stories Next.js web app. Use to run, start, or smoke-test the app.
---

Aura Stories is a Next.js 15.5.9 web app ("Premium Hikaye ve Roman Okuma Platformu") served on port 9002.

**Driver:** `.claude/skills/run-aura-stories/smoke.sh` — a curl-based smoke script that starts the server and tests key routes. All paths below are relative to the repo root.

## Prerequisites

```bash
pkg install nodejs curl
```

Node.js and curl are required. No display server or browser is needed — the smoke driver uses `curl` only.

## Build

```bash
npm install
```

This adds ~970 packages. On Termux/ARM the native SWC binaries won't install; Next.js falls back to WASM automatically.

## Run (agent path)

```bash
bash .claude/skills/run-aura-stories/smoke.sh
```

The driver does the full lifecycle:
1. `npm install` (if `node_modules` missing)
2. Starts the dev server (`node ./node_modules/next/dist/bin/next dev -p 9002`)
3. Waits for HTTP readiness (up to 60s)
4. Runs 4 smoke checks against the running server
5. Reports pass/fail and exits with the appropriate code
6. Kills the server on exit (trap EXIT)

Pass a custom port: `bash .claude/skills/run-aura-stories/smoke.sh 3000`.

**To interact with the running server manually** (e.g., while debugging):

```bash
# Start (keep running in foreground):
node ./node_modules/next/dist/bin/next dev -p 9002

# Smoke a running instance:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9002/
```

## Run (human path)

The `package.json` dev script uses Turbopack and assumes a working shebang — both break on Termux/ARM:

```
npm run dev                    # fails: shebang + Turbopack WASM
```

Humans on macOS/Windows with native SWC can use `npm run dev` normally. On Termux, use the direct `node` invocation above.

## Test

```bash
npm run typecheck              # tsc --noEmit
npm run lint                   # next lint
```

## Gotchas

### Shebangs broken on Termux

All binaries in `node_modules/.bin/` use `#!/usr/bin/env node`, but Termux has `env` at `/data/data/com.termux/files/usr/bin/env`. Any `npx` or `./node_modules/.bin/*` invocation fails with "cannot execute: required file not found."

**Fix:** always invoke via `node ./node_modules/<pkg>/dist/bin/<entry>` directly.

### Turbopack WASM doesn't support `turbo.createProject`

Next.js 15.5.9's `--turbopack` flag tries to load native SWC bindings. On ARM Android those aren't published, so it falls back to `@next/swc-wasm-nodejs`. The WASM build lacks `turbo.createProject`, so the dev server crashes immediately.

**Fix:** drop `--turbopack`. Use `node ./node_modules/next/dist/bin/next dev -p 9002`.

### First compilation is slow (~39s)

The initial page compilation on this ARM device takes ~40 seconds. Subsequent requests are fast (~400ms). The smoke script's 60s timeout covers the cold start.

### Only the homepage (`/`) exists

The app currently has a single route: `app/page.tsx`. Routes like `/kitaplik`, `/kesfet`, `/profil` return 404. The smoke script only tests `/` and verifies 404 handling.

### `/tmp` is not writable on Termux

Termux sandboxes the filesystem — `/tmp` is not writable. The smoke script uses `$TMPDIR` (set by Termux) with fallback to `<project>/.tmp` for PID and body files.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `sh: next: command not found` | `node_modules` not installed. Run `npm install`. |
| `.bin/next: cannot execute: required file not found` | Termux shebang issue. Use `node ./node_modules/next/dist/bin/next` instead. |
| `turbo.createProject is not supported by the wasm bindings` | Turbopack not supported on this platform. Remove `--turbopack`. |
| Server starts but curl returns 000 | Wait for compilation. First request after cold start can take ~40s on ARM. |
| `npm install` fails with native module errors | This is expected for `sharp` — it falls back. If it blocks, try `npm install --ignore-scripts`. |
| `Permission denied` writing to `/tmp` | Termux sandbox — `/tmp` is not writable. Use `$TMPDIR` or a project-local temp directory. |
