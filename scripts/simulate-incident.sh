#!/bin/sh

DOWN_FOR=${1:-90}
echo "Stopping taskflow-prod for ${DOWN_FOR}s. Watch http://localhost:9090/alerts"
docker stop taskflow-prod
sleep "$DOWN_FOR"
echo "Restarting taskflow-prod"
docker start taskflow-prod
echo "Done. The alert should resolve within about a minute."
