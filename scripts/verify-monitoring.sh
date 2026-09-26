#!/bin/sh

set -eu
prom() { docker exec taskflow-prometheus wget -qO- "http://localhost:9090$1"; }

echo "Waiting for Prometheus to be ready"
i=0
until prom /-/ready > /dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -ge 30 ] && { echo "Prometheus did not become ready"; exit 1; }
  sleep 2
done

echo "Checking that Prometheus is scraping the production API"
i=0
until prom '/api/v1/query?query=up%7Bjob%3D%22taskflow-api%22%7D' | grep -q '"1"\]'; do
  i=$((i + 1)); [ "$i" -ge 20 ] && { echo "taskflow-api target is not up"; exit 1; }
  sleep 3
done
echo "  taskflow-api target is UP"

echo "Checking alert rules are loaded"
prom /api/v1/rules | grep -q 'TaskflowApiDown' || { echo "Alert rules missing"; exit 1; }
echo "  alert rules loaded"

echo "Checking Alertmanager"
docker exec taskflow-alertmanager wget -qO- http://localhost:9093/-/ready > /dev/null
echo "  Alertmanager ready"

echo "Currently firing alerts:"
prom /api/v1/alerts
echo
echo "Dashboards: Grafana http://localhost:3300  Prometheus http://localhost:9090  Alertmanager http://localhost:9093"
