#!/bin/sh

set -eu
TARGET=$1
TAG=$2
COMPOSE_FILE="deploy/docker-compose.${TARGET}.yml"

case "$TARGET" in
  staging) CONTAINER=taskflow-staging ;;
  production) CONTAINER=taskflow-prod ;;
  *) echo "Unknown target: $TARGET"; exit 1 ;;
esac


PREVIOUS=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER" 2>/dev/null | cut -d: -f2 || true)
echo "Deploying taskflow-api:${TAG} to ${TARGET} (currently running: ${PREVIOUS:-nothing})"

rollback() {
  echo "Deployment of ${TAG} to ${TARGET} failed"
  docker logs --tail 30 "$CONTAINER" || true
  if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$TAG" ]; then
    echo "Rolling back to ${PREVIOUS}"
    IMAGE_TAG=$PREVIOUS docker compose -f "$COMPOSE_FILE" up -d
    sh scripts/wait-healthy.sh "$CONTAINER" 60 && echo "Rollback to ${PREVIOUS} complete"
  else
    echo "No earlier version to roll back to"
  fi
  exit 1
}

IMAGE_TAG=$TAG docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
sh scripts/wait-healthy.sh "$CONTAINER" 60 || rollback
docker exec "$CONTAINER" node scripts/smoke-test.js http://localhost:3000 "$TARGET" || rollback

echo "taskflow-api:${TAG} is live on ${TARGET}"
