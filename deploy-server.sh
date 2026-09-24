#!/bin/zsh

# The server half of a deploy. deploy.sh runs this over ssh once it has built
# the image elsewhere and loaded it here as typo-blue:<commit>:
#
#   ./deploy-server.sh <commit>
#
#   check out <commit> -> run migrations from its image -> recreate the
#   containers from it -> check the published port -> remove images no
#   container can come back to
#
# Nothing is compiled here. The build used to run on this machine, and it
# pegged the CPU the site and its neighbours share for the length of every
# deploy.
#
# To roll back: `docker tag typo-blue:<previous commit> typo-blue:current` and
# `docker compose up -d`, if that image is still here; otherwise deploy the
# previous commit again.

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

cd "$(dirname "$0")"

COMMIT=${1:?usage: deploy-server.sh <commit>}
IMAGE=typo-blue:$COMMIT

LOCK_DIR=.deploy.lock

# One deploy at a time.
#
# Taken before the checkout moves, because moving it is itself a change to the
# machine: a deploy refused after updating leaves the checkout on a commit that
# the deploy in progress has never seen. Taken before the trap is installed, so
# failing to take it cannot clean up after the deploy that holds it.
if [[ -z ${DEPLOY_LOCK_HELD:-} ]] && ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "ERROR: another deploy is in progress (remove $LOCK_DIR if it is not)"
    exit 1
fi

cleanup() {
    rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT

# The image is built from <commit>, and the compose file it runs under comes
# from this checkout, so the two have to agree. Fast-forward to exactly that
# commit rather than to whatever main is now: if main moved while the image was
# building, the newer tree is not what was built.
#
# That can rewrite this file underneath the shell that is reading it, and zsh
# reads a script incrementally rather than all at once, so start over from the
# new version if it changed. zsh does not run an EXIT trap on exec, so the lock
# survives that restart; DEPLOY_LOCK_HELD is how the new process knows it
# already holds it rather than refusing its own deploy.
SCRIPT_BEFORE_UPDATE="$(shasum "$0")"
echo "==> Checking out $COMMIT..."
if ! git fetch --quiet origin || ! git merge --ff-only --quiet "$COMMIT"; then
    echo "ERROR: could not fast-forward the checkout to $COMMIT"
    exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$COMMIT" ]]; then
    # merge --ff-only onto an ancestor is a no-op, not a failure.
    echo "ERROR: the checkout is at $(git rev-parse --short HEAD), which is ahead of $COMMIT;"
    echo "       refusing to put an older release live. To roll back, see the top of this file."
    exit 1
fi
if [[ "$SCRIPT_BEFORE_UPDATE" != "$(shasum "$0")" ]]; then
    echo "==> deploy-server.sh changed in that update; restarting it..."
    export DEPLOY_LOCK_HELD=1
    exec "$0" "$@"
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "ERROR: $IMAGE is not loaded here; deploy.sh ships it before running this"
    exit 1
fi

# The app and the email worker are both declared with typo-blue:current.
# Moving that tag does not touch the running containers: a container holds the
# image it was created from, not the name.
docker tag "$IMAGE" typo-blue:current

echo "==> Running database migrations..."
if ! docker compose run --rm typo-blue pnpm drizzle-kit migrate; then
    echo "ERROR: database migration failed; the previous release is still running"
    exit 1
fi

echo "==> Deploying with Docker Compose..."
if ! docker compose up -d --remove-orphans; then
    echo "ERROR: docker compose failed"
    exit 1
fi

# Cold start is a database connection and binding a port; the rest of this is
# slack for a busy machine.
HEALTH_TIMEOUT_SECONDS=${HEALTH_TIMEOUT_SECONDS:-120}
echo "==> Verifying the published port..."
PUBLISHED_OK=""
for i in {1..$HEALTH_TIMEOUT_SECONDS}; do
    if curl -fsS -o /dev/null http://localhost:23000/ 2>/dev/null; then
        echo "typo-blue is answering after ${i}s"
        PUBLISHED_OK=1
        break
    fi
    sleep 1
done
if [[ -z "$PUBLISHED_OK" ]]; then
    echo "ERROR: the published port is not serving $IMAGE"
    docker compose logs --tail 50 typo-blue || true
    exit 1
fi

# Nothing else removes old releases. Keep the one just started; docker refuses
# to remove an image a container still uses. The typo-blue-* images are what
# `docker compose build` left behind before images were built elsewhere.
echo "==> Removing old release images..."
for tag in $(docker image ls typo-blue --format '{{.Tag}}'); do
    if [[ "$tag" != current && "$tag" != "$COMMIT" ]]; then
        docker rmi "typo-blue:$tag" >/dev/null 2>&1 || true
    fi
done
for image in typo-blue-typo-blue typo-blue-typo-blue-email-worker; do
    docker rmi "$image" >/dev/null 2>&1 || true
done

echo "==> Deployment successful!"
echo "==> Checking container status..."
docker compose ps
