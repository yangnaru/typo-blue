#!/bin/zsh

# Deploy what is on origin/main: build its image on this machine, load it on
# the server, and have the server switch to it.
#
#   ./deploy.sh
#
#   fetch origin/main into a clean build checkout -> build typo-blue:<commit>
#   -> ship the image over ssh -> run deploy-server.sh <commit> on the server
#
# The build used to run on the server, where it pegged the CPU the site and its
# neighbours share, and left an image and its build cache behind every time.
# Both machines are arm64, so an image built here runs there as is.
#
# The server is reached by the ssh alias in DEPLOY_HOST, so its address lives
# in ~/.ssh/config and not in this public repository:
#
#   Host typo-blue-deploy
#       HostName <the server's address>
#
# Docker here has to be running. OrbStack is started if it is not.

set -euo pipefail

DEPLOY_HOST=${DEPLOY_HOST:-typo-blue-deploy}
# Expanded by the server's shell, not this one.
REMOTE_DIR=${REMOTE_DIR:-'~/Git/typo-blue'}
# A checkout of its own rather than the one this script was run from: that one
# holds node_modules, .next and the rest of a working tree, and it may not be
# what was pushed. This one is cleaned to exactly the commit being deployed.
BUILD_DIR=${DEPLOY_BUILD_DIR:-$HOME/.cache/typo-blue-deploy}
LOCK_DIR=$BUILD_DIR.lock

REPO_URL="$(git -C "$(dirname "$0")" remote get-url origin)"

mkdir -p "$(dirname "$BUILD_DIR")"
# One deploy at a time: two would share the build checkout.
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "ERROR: another deploy is in progress (remove $LOCK_DIR if it is not)"
    exit 1
fi

cleanup() {
    rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT

if ! docker info >/dev/null 2>&1; then
    if command -v orb >/dev/null; then
        echo "==> Starting OrbStack..."
        orb start
    fi
    if ! docker info >/dev/null 2>&1; then
        echo "ERROR: Docker is not running on this machine"
        exit 1
    fi
fi

echo "==> Fetching origin/main..."
if [[ ! -d $BUILD_DIR/.git ]]; then
    git clone --quiet "$REPO_URL" "$BUILD_DIR"
fi
git -C "$BUILD_DIR" fetch --quiet origin main
COMMIT="$(git -C "$BUILD_DIR" rev-parse FETCH_HEAD)"
git -C "$BUILD_DIR" checkout --quiet --detach "$COMMIT"
git -C "$BUILD_DIR" clean -qffdx
IMAGE=typo-blue:$COMMIT
echo "==> Deploying $(git -C "$BUILD_DIR" log -1 --format='%h %s')"

# Only what has been pushed goes out, because the server checks out the same
# commit for its compose file.
if [[ "$(git -C "$(dirname "$0")" rev-parse HEAD)" != "$COMMIT" ]]; then
    echo "    (not this checkout's HEAD, $(git -C "$(dirname "$0")" rev-parse --short HEAD); push first to deploy that)"
fi

remote() {
    ssh "$DEPLOY_HOST" "zsh -l -c '$1'"
}

# A deploy that failed after shipping can be retried without rebuilding or
# sending the image again.
if remote "docker image inspect $IMAGE" >/dev/null 2>&1; then
    echo "==> The server already has $IMAGE"
else
    # NEXT_PUBLIC_* are compiled into the client bundle, so the build needs
    # them. The server's .env stays their one source of truth; only these
    # public values are read from it.
    echo "==> Reading build-time settings from the server..."
    BUILD_ARGS=()
    for line in ${(f)"$(remote "grep ^NEXT_PUBLIC_ $REMOTE_DIR/.env")"}; do
        value=${line#*=}
        # Compose strips the quotes .env values may carry; do the same.
        if [[ $value == \"*\" || $value == \'*\' ]]; then
            value=${value:1:-1}
        fi
        BUILD_ARGS+=(--build-arg "${line%%=*}=$value")
    done
    if (( ${#BUILD_ARGS} == 0 )); then
        echo "ERROR: no NEXT_PUBLIC_* settings found in $REMOTE_DIR/.env on $DEPLOY_HOST"
        exit 1
    fi

    echo "==> Building $IMAGE..."
    DOCKER_BUILDKIT=1 docker build \
        --platform linux/arm64 \
        "${BUILD_ARGS[@]}" \
        --tag "$IMAGE" \
        "$BUILD_DIR"

    echo "==> Shipping $IMAGE to $DEPLOY_HOST..."
    docker save "$IMAGE" | zstd -T0 -3 -q | remote "zstd -dcq | docker load --quiet"
fi

# One-time: a server checkout from before this script existed has no
# deploy-server.sh to run, so bring it up to the commit being deployed first.
# Every later deploy leaves moving the checkout to deploy-server.sh, which does
# it under its lock.
if ! remote "test -x $REMOTE_DIR/deploy-server.sh"; then
    echo "==> Bringing the server checkout up to $COMMIT for its first deploy-server.sh..."
    remote "cd $REMOTE_DIR && git fetch --quiet origin && git merge --ff-only --quiet $COMMIT"
fi

echo "==> Switching the server to $IMAGE..."
remote "$REMOTE_DIR/deploy-server.sh $COMMIT"

# The server has the image now, and this copy only existed to be sent there.
# Keeping the one just deployed makes a retry cheap; the build cache that makes
# the next build fast is separate and stays.
for tag in $(docker image ls typo-blue --format '{{.Tag}}'); do
    if [[ "$tag" != "$COMMIT" ]]; then
        docker rmi "typo-blue:$tag" >/dev/null 2>&1 || true
    fi
done
