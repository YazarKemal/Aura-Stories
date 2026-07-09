#!/data/data/com.termux/files/usr/bin/env bash
# Clean Next.js build for Termux/ARM.
# Handles shebang fixes, Turbopack disable, WASM fallback, and verification.
#
# Usage:
#   bash build.sh          # full build (dev server + typecheck)
#   bash build.sh dev      # dev server only
#   bash build.sh check    # typecheck + lint only
#   bash build.sh build    # production build

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$PROJECT_DIR"

TMPDIR="${TMPDIR:-${PROJECT_DIR}/.tmp}"
mkdir -p "$TMPDIR"

MODE="${1:-full}"

# ANSI renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()    { echo -e "${BLUE}[next-builder]${NC} $*"; }
success(){ echo -e "${GREEN}[next-builder] ✓${NC} $*"; }
warn()   { echo -e "${YELLOW}[next-builder] ⚠${NC} $*"; }
fail()   { echo -e "${RED}[next-builder] ✗${NC} $*"; }

# ── Adım 0: Shebang Fix ──────────────────────────────────────
apply_shebang_fix() {
  if [ -d "node_modules/.bin" ] && command -v termux-fix-shebang &>/dev/null; then
    log "Applying shebang fixes (android-path-resolver)..."
    termux-fix-shebang node_modules/.bin/* 2>/dev/null || true
    success "Shebangs fixed"
  else
    warn "termux-fix-shebang not available — using node-invocation fallback"
  fi
}

# ── Adım 1: Bağımlılıklar ────────────────────────────────────
install_deps() {
  if [ ! -d "node_modules" ]; then
    log "Installing dependencies (this may take a while on ARM)..."
    npm install --silent 2>&1 | tail -3
    apply_shebang_fix
    success "Dependencies installed"
  else
    log "node_modules exists, checking integrity..."
    if [ ! -f "node_modules/next/dist/bin/next" ]; then
      warn "next CLI missing — reinstalling..."
      npm install --silent
      apply_shebang_fix
    fi
    success "Dependencies OK"
  fi
}

# ── Next.js Invocation Helper ─────────────────────────────────
# Shebang'ler fixlendiyse doğrudan binary kullanır, yoksa node ile çalıştırır.
run_next() {
  local args="$*"
  if [ -x "node_modules/.bin/next" ]; then
    ./node_modules/.bin/next $args
  else
    node ./node_modules/next/dist/bin/next $args
  fi
}

# ── Dev Server ────────────────────────────────────────────────
start_dev() {
  local port="${1:-9002}"
  log "Starting Next.js dev server on port ${port}..."

  # Turbopack: ARM'da WASM fallback turbo.createProject desteklemez → devre dışı
  run_next dev -p "$port" &
  local pid=$!

  log "Waiting for server (PID: $pid)..."
  for i in $(seq 1 90); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}" 2>/dev/null | grep -qE '^(2|3|4)'; then
      success "Server ready on http://localhost:${port} (${i}s)"
      echo "$pid" > "${TMPDIR}/next-dev-${port}.pid"
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      fail "Server process died. Check logs."
      return 1
    fi
    sleep 1
  done
  fail "Server did not become ready within 90s"
  return 1
}

# ── Production Build ─────────────────────────────────────────
prod_build() {
  log "Running production build (NODE_ENV=production)..."
  NODE_ENV=production run_next build
  success "Production build complete (output: .next/)"
}

# ── Type Checking ─────────────────────────────────────────────
run_typecheck() {
  log "Running TypeScript type check..."
  if npx tsc --noEmit 2>&1; then
    success "TypeScript: no errors"
  else
    fail "TypeScript: errors found"
    return 1
  fi
}

# ── Lint ──────────────────────────────────────────────────────
run_lint() {
  log "Running ESLint..."
  if run_next lint 2>&1; then
    success "ESLint: clean"
  else
    warn "ESLint: warnings/errors found (see above)"
  fi
}

# ═══════════════════════════════════════════════════════════════
# Ana akış
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Next.js Clean Builder (Termux)   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""

install_deps

case "$MODE" in
  dev)
    start_dev "${2:-9002}"
    ;;
  check)
    run_typecheck
    run_lint
    ;;
  build)
    prod_build
    ;;
  full|*)
    # Tam döngü: önce check, sonra dev server
    log "=== Full build cycle ==="
    run_typecheck || warn "Typecheck failed, continuing..."
    run_lint
    echo ""
    log "Typecheck/lint complete. Starting dev server..."
    start_dev "${2:-9002}"
    ;;
esac

echo ""
success "Build complete."
