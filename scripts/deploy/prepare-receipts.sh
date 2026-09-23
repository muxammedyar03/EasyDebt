#!/usr/bin/env bash
# Run on the VPS before recreating the app. Never silently mask old container receipts.
set -euo pipefail
image=${1:?Pass the new application image}
volume=feat_debt_uploads
container=feat_debt_app
# If the app already uses this volume, no migration is needed.
if docker inspect --format '{{range .Mounts}}{{println .Name}}{{end}}' "$container" 2>/dev/null | grep -qx "$volume"; then
  exit 0
fi
if ! docker inspect "$container" >/dev/null 2>&1; then
  # On first installation Docker populates the volume from the owned image directory.
  exit 0
fi
backup_dir=$(mktemp -d /var/tmp/easydebt-receipts.XXXXXX)
# Keep the source and the host copy until the operator verifies the deployment.
was_running=$(docker inspect --format '{{.State.Running}}' "$container")
recover() {
  if [ "$was_running" = true ]; then docker start "$container" >/dev/null || true; fi
}
trap recover ERR
docker stop "$container" >/dev/null
if docker cp "$container:/app/uploads/." "$backup_dir/"; then
  echo "Existing receipt files copied to $backup_dir"
else
  # Only treat a missing directory as empty; permissions/IO errors must abort.
  docker start "$container" >/dev/null
  if ! docker exec "$container" sh -c 'test ! -e /app/uploads'; then
    echo "Could not preserve existing uploads" >&2
    exit 1
  fi
  docker stop "$container" >/dev/null
fi
docker volume create "$volume" >/dev/null
docker run --rm --user 0 --entrypoint sh \
  -v "$volume:/target" -v "$backup_dir:/source:ro" "$image" \
  -c 'cp -a /source/. /target/ && chown -R nextjs:nextjs /target'
echo "Receipts preserved in $volume; host safety copy retained at $backup_dir"
