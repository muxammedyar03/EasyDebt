#!/usr/bin/env bash
# EasyDebt Production — Safe Docker Image Cleanup
# Removes dangling and inactive images without touching database volumes or running containers.
set -euo pipefail

echo "=================================================="
echo "EasyDebt Docker Image Cleanup (Safe Mode)"
echo "=================================================="

echo "1. Checking disk usage before cleanup:"
df -h / | grep -E '^Filesystem|/' || true

echo ""
echo "2. Active containers and images currently in use:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo ""
echo "3. Removing dangling (<none>) images..."
docker image prune -f

echo ""
echo "4. Removing unused EasyDebt images (keeping current active version)..."
# Collect IDs of active images
ACTIVE_IDS=$(docker inspect --format '{{.Image}}' feat_debt_app feat_debt_db feat_debt_push-worker 2>/dev/null || true)

# Find and remove inactive ghcr.io/muxammedyar03/easydebt images
docker images --filter "reference=ghcr.io/muxammedyar03/easydebt*" --format "{{.ID}} {{.Repository}}:{{.Tag}}" | while read -r id repo_tag; do
  if echo "$ACTIVE_IDS" | grep -q "$id"; then
    echo "  [KEEP] Active image: $repo_tag ($id)"
  else
    echo "  [DELETE] Inactive image: $repo_tag ($id)"
    docker rmi "$id" 2>/dev/null || true
  fi
done

echo ""
echo "5. Checking disk usage after cleanup:"
df -h / | grep -E '^Filesystem|/' || true

echo ""
echo "✅ Cleanup completed safely! Database volumes and running containers were not modified."
