#!/bin/bash
# Smoke test driver for Aura Stories (Next.js web app)
# Launches the dev server and hits key routes with curl.
# Usage: ./smoke.sh [port]
#   port defaults to 9002
#
# If a server is already running on the port, reuses it instead of
# starting a new one.

set -euo pipefail

PORT="${1:-9002}"
BASE="http://localhost:${PORT}"
PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
TMPDIR="${TMPDIR:-${PROJECT_DIR}/.tmp}"
mkdir -p "$TMPDIR"
PID_FILE="${TMPDIR}/aura-stories-dev-${PORT}.pid"
BODY_FILE="${TMPDIR}/aura-smoke-body.txt"
PASS=0
FAIL=0
LAUNCHED_BY_US=false

cleanup() {
  if $LAUNCHED_BY_US && [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
}
trap cleanup EXIT

log()  { echo "  [INFO] $*"; }
pass() { echo "  [PASS] $*"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $*"; FAIL=$((FAIL + 1)); }

# ── Check for existing server ──────────────────────────────────
if curl -s -o /dev/null -w "%{http_code}" "$BASE" 2>/dev/null | grep -qE '^(2|3|4)'; then
  log "Port ${PORT} already has a responding server — reusing it."
else
  echo "==> Starting Aura Stories dev server on port ${PORT}..."

  cd "$PROJECT_DIR"

  if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install --silent
  fi

  # Termux: shebangs in node_modules/.bin point to /usr/bin/env which
  # doesn't exist. Invoke next directly via node.
  # Turbopack (--turbopack): disabled — WASM fallback on ARM doesn't
  # support turbo.createProject.
  node ./node_modules/next/dist/bin/next dev -p "$PORT" &
  SERVER_PID=$!
  echo "$SERVER_PID" > "$PID_FILE"
  LAUNCHED_BY_US=true

  # ── Wait for ready ────────────────────────────────────────────
  log "Waiting for server to become ready..."
  for i in $(seq 1 60); do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE" 2>/dev/null | grep -qE '^(2|3|4)'; then
      log "Server ready after ${i}s"
      break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "  [FATAL] Server process died. Check output above."
      exit 1
    fi
    sleep 1
  done
fi

# ── Smoke tests ───────────────────────────────────────────────
echo ""
echo "==> Running smoke tests..."

check() {
  local desc="$1" url="$2" expected_code="$3" grep_pattern="${4:-}"
  local http_code
  http_code=$(curl -s -o "$BODY_FILE" -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$http_code" = "$expected_code" ]; then
    if [ -n "$grep_pattern" ]; then
      if grep -q "$grep_pattern" "$BODY_FILE"; then
        pass "$desc ($http_code, matched '$grep_pattern')"
      else
        fail "$desc ($http_code, but missing '$grep_pattern')"
      fi
    else
      pass "$desc ($http_code)"
    fi
  else
    fail "$desc (expected $http_code, got $http_code)"
  fi
}

# Homepage
check "Homepage loads"              "$BASE/"                  "200" "Aura Stories"
check "Homepage has layout"         "$BASE/"                  "200" "font-body"

# Static assets (Next.js serves these in dev)
check "Favicon resolves"            "$BASE/favicon.ico"       "200"

# 404 handling
check "Unknown route returns 404"   "$BASE/nonexistent-xyz"   "404"

# ── Results ───────────────────────────────────────────────────
echo ""
echo "==> Results: ${PASS} passed, ${FAIL} failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
