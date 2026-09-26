#!/bin/sh

set -eu
IMAGE=$1
OUT=reports/security
TRIVY_IMAGE=aquasec/trivy:0.56.2
mkdir -p "$OUT"

echo "=== npm audit: production dependencies ==="
npm audit --omit=dev --json > "$OUT/npm-audit.json" || true
node -e "const v=require('./${OUT}/npm-audit.json').metadata.vulnerabilities; console.log('Findings by severity:', JSON.stringify(v));"

npm audit --omit=dev --audit-level=high

echo "=== npm audit: dev dependencies (reported, not gated) ==="
npm audit --audit-level=none || true

echo "=== Trivy: scanning ${IMAGE} for vulnerabilities and embedded secrets ==="

cid=$(docker create \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v trivy-cache:/root/.cache \
  "$TRIVY_IMAGE" image --scanners vuln,secret --ignorefile /tmp/.trivyignore \
  --format json --output /tmp/trivy-report.json --no-progress "$IMAGE")
docker cp .trivyignore "$cid:/tmp/.trivyignore"
docker start -a "$cid"
docker cp "$cid:/tmp/trivy-report.json" "$OUT/trivy-report.json"
docker rm "$cid" > /dev/null

node scripts/summarise-trivy.js "$OUT/trivy-report.json" "$OUT/trivy-summary.md"
