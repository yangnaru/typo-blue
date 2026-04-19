#!/bin/zsh

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Enable BuildKit for Docker builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "==> Pulling latest code from git..."
if ! git pull; then
    echo "ERROR: git pull failed"
    exit 1
fi

echo "==> Building Docker images..."
if ! docker compose build; then
    echo "ERROR: docker compose build failed"
    exit 1
fi

echo "==> Running database migrations..."
if ! docker compose run --rm typo-blue pnpm drizzle-kit migrate; then
    echo "ERROR: database migration failed"
    exit 1
fi

echo "==> Deploying with Docker Compose..."
if ! docker compose up -d --remove-orphans; then
    echo "ERROR: docker compose failed"
    exit 1
fi

echo "==> Deployment successful!"
echo "==> Checking container status..."
docker compose ps
