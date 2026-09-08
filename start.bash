#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
for interpreter in python3 python; do
    if command -v "$interpreter" >/dev/null 2>&1; then
        exec "$interpreter" "$PROJECT_ROOT/start.py" "$@"
    fi
done
printf '%s\n' 'Error: install Python 3.11 or newer and add it to PATH.' >&2
exit 1
