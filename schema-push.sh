#!/bin/sh
# schema-push.sh
# 在 Docker 容器內執行 zenstack generate + prisma db push
# schema.zmodel 變更後執行此腳本，無需 rebuild image
#
# 用法: ./schema-push.sh
# (Windows Git Bash 或 WSL 皆可)

set -e

CONTAINER="zenku-app-1"

echo "📦 Copying schema files into container..."
docker cp schema.zmodel "$CONTAINER":/app/schema.zmodel
docker cp schema.production.zmodel "$CONTAINER":/app/schema.production.zmodel

echo "⚙️  Running zenstack generate..."
docker exec "$CONTAINER" sh -c "cp schema.production.zmodel schema.zmodel && bunx zenstack generate"

echo "🗄️  Pushing DB schema changes..."
docker exec "$CONTAINER" bunx prisma db push

echo "✅ Done! Server is restarting via bun --watch..."
