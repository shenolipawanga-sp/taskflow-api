#!/bin/sh

set -eu
: "${SMTP_USER:?SMTP_USER is required}"
: "${SMTP_PASS:?SMTP_PASS is required}"
COMPOSE_FILE=monitoring/docker-compose.monitoring.yml

docker volume create taskflow-alertmanager-secrets > /dev/null
docker run --rm -e SMTP_PASS -v taskflow-alertmanager-secrets:/secrets alpine:3.20 \
  sh -c 'printf "%s" "$SMTP_PASS" > /secrets/smtp_password && chmod 444 /secrets/smtp_password'

export ALERT_EMAIL_FROM="$SMTP_USER"
export ALERT_EMAIL_TO="${ALERT_EMAIL_TO:-$SMTP_USER}"

docker compose -f "$COMPOSE_FILE" build

echo "Validating Prometheus config and alert rules with promtool"
docker run --rm --entrypoint promtool taskflow-prometheus:latest check config /etc/prometheus/prometheus.yml

docker compose -f "$COMPOSE_FILE" up -d
