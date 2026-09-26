#!/bin/sh

set -eu
CONTAINER=$1
TIMEOUT=${2:-60}
elapsed=0

while [ "$elapsed" -lt "$TIMEOUT" ]; do
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo missing)
  echo "  ${CONTAINER}: ${status} (${elapsed}s)"
  [ "$status" = "healthy" ] && exit 0
  [ "$status" = "unhealthy" ] && exit 1
  sleep 3
  elapsed=$((elapsed + 3))
done
echo "  timed out waiting for ${CONTAINER}"
exit 1
