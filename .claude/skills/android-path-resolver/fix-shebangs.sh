#!/data/data/com.termux/files/usr/bin/env bash
# Fix shebangs in node_modules/.bin for Termux compatibility.
# Uses termux-fix-shebang to rewrite #!/usr/bin/env → Termux-compatible paths.
#
# Usage: bash fix-shebangs.sh [target-dir]
#   target-dir defaults to <project-root>/node_modules/.bin

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
TARGET="${1:-${PROJECT_DIR}/node_modules/.bin}"

if [ ! -d "$TARGET" ]; then
  echo "[android-path-resolver] Target not found: $TARGET"
  echo "Run 'npm install' first, or pass a different target directory."
  exit 1
fi

echo "[android-path-resolver] Fixing shebangs in: $TARGET"
termux-fix-shebang "$TARGET"/* 2>/dev/null || true
echo "[android-path-resolver] Done. Shebangs fixed for Termux."
