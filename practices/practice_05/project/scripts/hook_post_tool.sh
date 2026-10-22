#!/usr/bin/env bash
if [ ! -t 0 ]; then
  INPUT=$(cat)
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"
./scripts/check_all.sh >&2
echo "{}"
