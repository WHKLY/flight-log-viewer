#!/usr/bin/env bash
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
DEFAULT_DATASET="$ROOT/data/26.8.26侦察/ZC_20260826_1533_flight2"

DATASET="${FLV_DATASET:-$DEFAULT_DATASET}"
OUTPUT="${FLV_OUTPUT:-$ROOT/public-data}"
HOST="${FLV_HOST:-127.0.0.1}"
PORT="${FLV_PORT:-8000}"

cd "$ROOT"

if ! [ -d "$DATASET" ]; then
  printf 'Dataset directory not found: %s\n' "$DATASET" >&2
  exit 2
fi

python3 scripts/flv_build.py --dataset "$DATASET" --output "$OUTPUT"

printf '\nOpen: http://%s:%s/viewer/index.html\n' "$HOST" "$PORT"
printf 'Dataset: %s\n' "$DATASET"
printf 'Press Ctrl-C to stop the server.\n\n'

exec python3 -m http.server "$PORT" --bind "$HOST"

