#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CLI_PATH="$SCRIPT_DIR/dist-tools/fetch-cli.cjs"

if ! command -v node >/dev/null 2>&1; then
  echo "[Fetch] Node.js is required but was not found in PATH." >&2
  exit 1
fi

if [ ! -f "$CLI_PATH" ]; then
  echo "[Fetch] Missing runtime CLI at $CLI_PATH. Build it with: npm run build:fetch-cli" >&2
  exit 1
fi

node "$CLI_PATH" "$@"

