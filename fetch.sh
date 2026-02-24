#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
RELEASE_CLI_PATH="$SCRIPT_DIR/tools/fetch-cli.cjs"
DEV_CLI_PATH="$SCRIPT_DIR/dist/tools/fetch-cli.cjs"

if ! command -v node >/dev/null 2>&1; then
  echo "[Fetch] Node.js is required but was not found in PATH." >&2
  exit 1
fi

if [ -f "$RELEASE_CLI_PATH" ]; then
  CLI_PATH="$RELEASE_CLI_PATH"
elif [ -f "$DEV_CLI_PATH" ]; then
  CLI_PATH="$DEV_CLI_PATH"
else
  echo "[Fetch] Missing runtime CLI at $RELEASE_CLI_PATH (release) and $DEV_CLI_PATH (dev). Build it with: npm run build:fetch-cli" >&2
  exit 1
fi

node "$CLI_PATH" "$@"
