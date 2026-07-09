#!/data/data/com.termux/files/usr/bin/env bash
# Safe git commit wrapper for Termux/Android.
# Handles pre-commit verification, shebang-aware hooks, and Termux quirks.
#
# Usage:
#   bash safe-commit.sh "commit message"           # commit all staged changes
#   bash safe-commit.sh "message" --no-verify      # skip verification hooks
#   bash safe-commit.sh "message" --files a.ts b.ts # commit specific files
#   bash safe-commit.sh --hook-install              # install pre-commit hook
#   bash safe-commit.sh --status                    # show repo status

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

TMPDIR="${TMPDIR:-${PROJECT_DIR}/.tmp}"
mkdir -p "$TMPDIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()    { echo -e "${BLUE}[git-safe]${NC} $*"; }
success(){ echo -e "${GREEN}[git-safe] ✓${NC} $*"; }
warn()   { echo -e "${YELLOW}[git-safe] ⚠${NC} $*"; }
fail()   { echo -e "${RED}[git-safe] ✗${NC} $*"; }

# ── Pre-commit Checks ────────────────────────────────────────
run_precommit_checks() {
  local errors=0

  log "Running pre-commit checks..."

  if [ ! -d "node_modules" ]; then
    warn "node_modules missing, skipping JS checks"
    return 0
  fi

  # TypeScript typecheck (only if .ts/.tsx files staged)
  local staged_ts
  staged_ts=$(git diff --cached --name-only -- '*.ts' '*.tsx' 2>/dev/null || true)
  if [ -n "$staged_ts" ]; then
    log "Staged TS files detected, running typecheck..."
    if node ./node_modules/.bin/tsc --noEmit 2>&1 | tail -5; then
      success "TypeScript: OK"
    else
      fail "TypeScript: errors found in staged files"
      errors=$((errors + 1))
    fi
  else
    log "No TS files staged, skipping typecheck"
  fi

  # ESLint on staged files
  if [ -n "$staged_ts" ]; then
    log "Running ESLint on staged files..."
    if node ./node_modules/next/dist/bin/next lint 2>&1 | tail -5; then
      success "ESLint: OK"
    else
      warn "ESLint: issues found (non-blocking)"
    fi
  fi

  # No sensitive/temp files staged
  local bad_files
  bad_files=$(git diff --cached --name-only -- '.tmp/*' '*.pid' '.env' '.env.local' 2>/dev/null || true)
  if [ -n "$bad_files" ]; then
    fail "Sensitive/temp files staged: $bad_files"
    errors=$((errors + 1))
  fi

  return $errors
}

# ── Commit ────────────────────────────────────────────────────
do_commit() {
  local message="$1"
  shift
  local extra_args=("$@")

  log "Committing: '$message'"
  if git commit -m "$message" "${extra_args[@]}"; then
    success "Commit successful"
    git log -1 --oneline 2>/dev/null || true
  else
    fail "Commit failed"
    return 1
  fi
}

# ── Hook Installation ────────────────────────────────────────
install_hook() {
  local hook_file="${PROJECT_DIR}/.git/hooks/pre-commit"

  log "Installing pre-commit hook..."
  cat > "$hook_file" << 'HOOK_EOF'
#!/data/data/com.termux/files/usr/bin/env bash
# Auto-installed by git-safe-commit skill
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
bash "$PROJECT_DIR/.claude/skills/git-safe-commit/safe-commit.sh" --precommit-only
exit $?
HOOK_EOF
  chmod +x "$hook_file"
  success "Pre-commit hook installed: $hook_file"
}

# ── Status ────────────────────────────────────────────────────
show_status() {
  echo ""
  echo -e "${BLUE}═══ Git Status ═══${NC}"
  git status --short 2>/dev/null || true
  echo ""
  echo -e "${BLUE}═══ Recent Commits ═══${NC}"
  git log --oneline -5 2>/dev/null || true
  echo ""
  echo -e "${BLUE}═══ Branch ═══${NC}"
  git branch --show-current 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# Ana akış
# ═══════════════════════════════════════════════════════════════

case "${1:-}" in
  --hook-install)
    install_hook
    ;;
  --status)
    show_status
    ;;
  --precommit-only)
    run_precommit_checks
    ;;
  "")
    echo "Usage: bash safe-commit.sh <message> [--no-verify] [--files ...]"
    echo "       bash safe-commit.sh --hook-install"
    echo "       bash safe-commit.sh --status"
    exit 1
    ;;
  *)
    MESSAGE="$1"
    shift || true
    NO_VERIFY=false
    EXTRA_ARGS=()

    for arg in "$@"; do
      case "$arg" in
        --no-verify) NO_VERIFY=true ;;
        *) EXTRA_ARGS+=("$arg") ;;
      esac
    done

    if $NO_VERIFY; then
      warn "Skipping pre-commit checks (--no-verify)"
    else
      run_precommit_checks || {
        fail "Pre-commit checks failed. Use --no-verify to skip."
        exit 1
      }
    fi

    do_commit "$MESSAGE" "${EXTRA_ARGS[@]}"
    ;;
esac
