#!/usr/bin/env bash
# Usage: db/run.sh migrate|test [branch]   (branch defaults to production)
# Uses the direct (non-pooled) URL, as migrations need session state.
set -euo pipefail
cd "$(dirname "$0")"

url="$(neon connection-string "${2:-production}")"

case "${1:-}" in
  migrate)
    for f in migrations/*.sql; do
      echo "== $f"
      psql "$url" -X -q -v ON_ERROR_STOP=1 -f "$f"
    done ;;
  test)
    # Each test file runs in a transaction and rolls back.
    for f in tests/*.sql; do
      echo "== $f"
      psql "$url" -X -q -t -v ON_ERROR_STOP=1 -f "$f" | sed '/^\s*$/d'
    done ;;
  *) echo "usage: db/run.sh migrate|test [branch]" >&2; exit 2 ;;
esac
