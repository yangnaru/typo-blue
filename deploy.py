"""Deploy what is on origin/main.

    mise run deploy        (python deploy.py deploy)
    mise run deploy:local  (python deploy.py deploy:local)

    fetch origin/main into a clean build checkout -> have the server pull the
    image GitHub Actions built (deploy), or build typo-blue:<commit> here and
    ship it over ssh (deploy:local) -> check its NEXT_PUBLIC_* settings against
    the server's .env -> run deploy-server.sh <commit> on the server

The build used to run on the server, where it pegged the CPU the site and its
neighbours share, and left an image and its build cache behind every time.
Both machines are arm64, so an image built here runs there as is.

`deploy` builds nothing here. .github/workflows/main.yml builds every commit on
main and pushes the image to REGISTRY_IMAGE; the server pulls it from there, so
what crosses this machine's connection is a few ssh commands. Waiting for that
build is `gh`'s job -- `mise install` provides it -- so gh has to be logged in
(`gh auth login`). If the package is private, the server pulls it as whoever
it has done `docker login ghcr.io` as, with a token that can read packages.
`deploy:local` is the old way, for when GitHub is the problem; it needs none
of that, and Docker here instead.

NEXT_PUBLIC_* are compiled into the client bundle, so the image has to be built
with them. The server's .env is their one source of truth: deploy:local reads
them from it for the build, and the workflow is given them as repository
variables (`gh variable set NEXT_PUBLIC_URL ...`). Either way, an image whose
baked-in values disagree with the server's .env is refused before anything
switches to it.

The server half -- checking out the commit, migrations, recreating the
containers, the health check and removing old images -- is deploy-server.sh,
which this runs over ssh once the server has the image as typo-blue:<commit>.

The server is reached by the ssh alias in DEPLOY_HOST, so its address lives in
~/.ssh/config and not in this public repository:

    Host typo-blue-deploy
        HostName <the server's address>

For deploy:local, Docker here has to be running. OrbStack is started if it is
not.
"""

from __future__ import annotations

import json
import os
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent
DEPLOY_HOST = os.environ.get("DEPLOY_HOST", "typo-blue-deploy")
# Relative to the home directory on the server, which is where ssh starts.
REMOTE_DIR = os.environ.get("REMOTE_DIR", "Git/typo-blue")
# A checkout of its own rather than the one this was run from: that one holds
# node_modules, .next and the rest of a working tree, any of which the
# Dockerfile's COPYs would carry into the image, and it may not be what was
# pushed. This one is cleaned to exactly the commit being deployed.
BUILD_DIR = Path(
    os.environ.get("DEPLOY_BUILD_DIR", Path.home() / ".cache/typo-blue-deploy")
)
LOCK_DIR = BUILD_DIR.with_name(BUILD_DIR.name + ".lock")
GITHUB_REPOSITORY = "yangnaru/typo-blue"
# Where .github/workflows/main.yml pushes each commit on main.
REGISTRY_IMAGE = "ghcr.io/yangnaru/typo-blue"
IMAGE_WORKFLOW = "main.yml"
# A push takes a few seconds to show up as a workflow run.
WORKFLOW_APPEAR_SECONDS = 60
# The step of IMAGE_WORKFLOW that pushes the image, which is what a deploy
# waits for rather than the whole run.
IMAGE_PUSH_STEP = "Build and push the image"
IMAGE_POLL_SECONDS = 15
# gh on a flaky connection: a TLS handshake that times out, or no route to
# host for a moment. Asked again this many times, a few seconds apart, before
# the deploy gives up.
GH_ATTEMPTS = 5


class DeployError(Exception):
    pass


def step(message: str) -> None:
    print(f"==> {message}", flush=True)


def run(
    *args: str | Path, check: bool = True, quiet: bool = False, **kwargs
) -> subprocess.CompletedProcess:
    if quiet:
        kwargs.setdefault("stdout", subprocess.DEVNULL)
        kwargs.setdefault("stderr", subprocess.DEVNULL)
    kwargs.setdefault("stdin", subprocess.DEVNULL)
    result = subprocess.run([str(a) for a in args], check=False, **kwargs)
    if check and result.returncode != 0:
        raise DeployError(
            f"`{shlex.join(str(a) for a in args)}` exited with {result.returncode}"
        )
    return result


def succeeds(*args: str | Path) -> bool:
    return run(*args, check=False, quiet=True).returncode == 0


def output(*args: str | Path) -> str:
    return run(*args, stdout=subprocess.PIPE).stdout.decode().strip()


def poll(seconds: int, attempt) -> int | None:
    """Tries once a second; the seconds it took, or None if it never did."""
    for i in range(1, seconds + 1):
        if attempt():
            return i
        time.sleep(1)
    return None


class Server:
    """Commands on the server, each its own ssh invocation, through a login
    shell, since that is where docker's PATH is set up."""

    def __init__(self, host: str):
        self.host = host

    def _command(self, script: str, cwd: bool) -> list[str]:
        if cwd:
            script = f"cd {shlex.quote(REMOTE_DIR)} && {script}"
        return ["ssh", self.host, f"zsh -l -c {shlex.quote(script)}"]

    def run(
        self,
        *args: str,
        check: bool = True,
        quiet: bool = False,
        cwd: bool = False,
        **kwargs,
    ) -> subprocess.CompletedProcess:
        return run(
            *self._command(shlex.join(args), cwd), check=check, quiet=quiet, **kwargs
        )

    def shell(
        self, script: str, cwd: bool = False, **kwargs
    ) -> subprocess.CompletedProcess:
        """For the few steps that need a pipe or a redirect on the server."""
        return run(*self._command(script, cwd), **kwargs)

    def succeeds(self, *args: str, cwd: bool = False) -> bool:
        return self.run(*args, check=False, quiet=True, cwd=cwd).returncode == 0

    def output(self, *args: str, check: bool = True, cwd: bool = False) -> str:
        return (
            self.run(*args, check=check, cwd=cwd, stdout=subprocess.PIPE)
            .stdout.decode()
            .strip()
        )


def public_settings(server: Server) -> dict[str, str]:
    """The NEXT_PUBLIC_* settings in the server's .env."""
    lines = server.output(
        "grep", "^NEXT_PUBLIC_", ".env", check=False, cwd=True
    ).splitlines()
    settings = {}
    for line in lines:
        name, _, value = line.partition("=")
        # Compose strips the quotes .env values may carry; do the same.
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        settings[name] = value
    if not settings:
        raise DeployError(
            f"no NEXT_PUBLIC_* settings found in {REMOTE_DIR}/.env on {server.host}"
        )
    return settings


def ensure_docker() -> None:
    if succeeds("docker", "info"):
        return
    if shutil.which("orb"):
        step("Starting OrbStack...")
        run("orb", "start")
    if not succeeds("docker", "info"):
        raise DeployError("Docker is not running on this machine")


def fetch_main() -> str:
    step("Fetching origin/main...")
    if not (BUILD_DIR / ".git").is_dir():
        repo_url = output("git", "-C", REPO, "remote", "get-url", "origin")
        run("git", "clone", "--quiet", repo_url, BUILD_DIR)
    git = ("git", "-C", BUILD_DIR)
    run(*git, "fetch", "--quiet", "origin", "main")
    commit = output(*git, "rev-parse", "FETCH_HEAD")
    run(*git, "checkout", "--quiet", "--detach", commit)
    run(*git, "clean", "-qffdx")
    step(f"Deploying {output(*git, 'log', '-1', '--format=%h %s')}")

    # Only what has been pushed goes out, because the server checks out the
    # same commit for its compose file. What does come from here is this
    # script, and the release it drives is main's: one edited or unpushed would
    # be running steps the server half was never deployed with.
    head = output("git", "-C", REPO, "rev-parse", "HEAD")
    if head != commit:
        print(f"    (not this checkout's HEAD, {head[:8]}; push first to deploy that)")
    if Path(__file__).read_bytes() != (BUILD_DIR / "deploy.py").read_bytes():
        raise DeployError(
            f"this deploy.py is not the one at {commit[:12]}; commit and push it, or run\n"
            f"       the one on origin/main"
        )
    return commit


def build_and_ship(server: Server, commit: str) -> None:
    image = f"typo-blue:{commit}"
    # A deploy that failed after shipping can be retried without rebuilding or
    # sending the image again.
    if server.succeeds("docker", "image", "inspect", image):
        step(f"The server already has {image}")
        return

    step("Reading build-time settings from the server...")
    build_args = []
    for name, value in public_settings(server).items():
        build_args += ["--build-arg", f"{name}={value}"]

    step(f"Building {image}...")
    run(
        "docker",
        "build",
        "--platform",
        "linux/arm64",
        *build_args,
        "--tag",
        image,
        BUILD_DIR,
        env={**os.environ, "DOCKER_BUILDKIT": "1"},
    )

    step(f"Shipping {image} to {server.host}...")
    save = subprocess.Popen(
        ["docker", "save", image], stdout=subprocess.PIPE, stdin=subprocess.DEVNULL
    )
    compress = subprocess.Popen(
        ["zstd", "-T0", "-3", "-q"], stdin=save.stdout, stdout=subprocess.PIPE
    )
    save.stdout.close()
    load = server.shell(
        "zstd -dcq | docker load --quiet", check=False, stdin=compress.stdout
    )
    compress.stdout.close()
    if save.wait() != 0 or compress.wait() != 0 or load.returncode != 0:
        raise DeployError(f"could not ship {image} to {server.host}")


def gh_json(*args: str):
    """What gh prints with --json, asked again when the connection drops."""
    for attempt in range(1, GH_ATTEMPTS + 1):
        result = run("gh", *args, check=False, stdout=subprocess.PIPE)
        if result.returncode == 0:
            return json.loads(result.stdout)
        if attempt < GH_ATTEMPTS:
            print(
                f"    gh failed; asking again ({attempt}/{GH_ATTEMPTS - 1})", flush=True
            )
            time.sleep(5)
    raise DeployError(
        f"`gh {shlex.join(args)}` failed {GH_ATTEMPTS} times; is the connection up?"
    )


def image_run(commit: str) -> dict | None:
    """The newest run of the image workflow for this commit, as gh reports it."""
    runs = gh_json(
        "run",
        "list",
        "--repo",
        GITHUB_REPOSITORY,
        "--workflow",
        IMAGE_WORKFLOW,
        "--commit",
        commit,
        "--limit",
        "1",
        "--json",
        "databaseId,status,conclusion,url",
    )
    return runs[0] if runs else None


def wait_for_image(commit: str) -> None:
    """Until GitHub Actions has pushed this commit's image. It is the push step
    that is waited for, not the run."""
    found = None

    def appeared() -> bool:
        nonlocal found
        found = image_run(commit)
        return found is not None

    if poll(WORKFLOW_APPEAR_SECONDS, appeared) is None:
        raise DeployError(
            f"GitHub Actions has no {IMAGE_WORKFLOW} run for {commit[:12]}; start one with\n"
            f"       `gh workflow run {IMAGE_WORKFLOW} --repo {GITHUB_REPOSITORY}`, or build here\n"
            "       with `mise run deploy:local`"
        )
    url = found["url"]

    def ended(how: str) -> DeployError:
        return DeployError(
            f"the image build for {commit[:12]} ended {how}:\n"
            f"       {url}\n"
            "       rerun it, or build here with `mise run deploy:local`"
        )

    announced = False
    shown = None
    while True:
        view = gh_json(
            "run",
            "view",
            str(found["databaseId"]),
            "--repo",
            GITHUB_REPOSITORY,
            "--json",
            "status,conclusion,jobs",
        )
        steps = [s for job in view["jobs"] for s in job["steps"]]
        push = next((s for s in steps if s["name"] == IMAGE_PUSH_STEP), None)
        if push is not None and push["status"] == "completed":
            if push["conclusion"] != "success":
                raise ended(view["conclusion"] or push["conclusion"])
            return
        if view["status"] == "completed":
            if view["conclusion"] == "success":
                # The run passed without the step: it has been renamed.
                raise DeployError(
                    f"{IMAGE_WORKFLOW} has no step named {IMAGE_PUSH_STEP!r}, which is\n"
                    "       what this waits for; update IMAGE_PUSH_STEP in deploy.py"
                )
            raise ended(view["conclusion"])
        if not announced:
            step(f"Waiting for GitHub Actions to build {commit[:12]} ({url})...")
            announced = True
        current = next(
            (s["name"] for s in steps if s["status"] == "in_progress"), "Queued"
        )
        if current != shown:
            print(f"    {current}", flush=True)
            shown = current
        time.sleep(IMAGE_POLL_SECONDS)


def pull_image(server: Server, commit: str) -> None:
    """The server downloads the image GitHub Actions built; nothing of it
    crosses this machine's connection. It is kept under the same local name
    a deploy:local ships, typo-blue:<commit>, and the registry's name is
    dropped, so deploy-server.sh cannot tell which way it arrived."""
    image = f"typo-blue:{commit}"
    if server.succeeds("docker", "image", "inspect", image):
        step(f"The server already has {image}")
        return
    wait_for_image(commit)
    remote = f"{REGISTRY_IMAGE}:git-{commit}-arm64"
    step(f"Pulling {remote} on {server.host}...")
    if (
        server.run(
            "docker", "pull", "--platform", "linux/arm64", remote, check=False
        ).returncode
        != 0
    ):
        raise DeployError(
            f"{server.host} could not pull {remote}. If the package is private, the\n"
            "       server has to be logged in to ghcr.io (`docker login ghcr.io` there,\n"
            "       with a token that can read packages)"
        )
    server.run("docker", "tag", remote, image)
    server.run("docker", "rmi", remote, quiet=True)


def check_public_settings(server: Server, commit: str) -> None:
    """The image's NEXT_PUBLIC_* are fixed at build time; a release built with
    others than the server's .env would link to the wrong site."""
    image = f"typo-blue:{commit}"
    env = server.output(
        "docker",
        "image",
        "inspect",
        "--format",
        "{{range .Config.Env}}{{println .}}{{end}}",
        image,
    )
    baked = dict(line.partition("=")[::2] for line in env.splitlines() if line)
    mismatched = [
        name
        for name, value in public_settings(server).items()
        if baked.get(name) != value
    ]
    if mismatched:
        server.run("docker", "rmi", image, quiet=True, check=False)
        raise DeployError(
            f"{image} was built with other {', '.join(mismatched)} than the server's\n"
            "       .env has. Set them as repository variables to match\n"
            f"       (`gh variable set NAME --repo {GITHUB_REPOSITORY}`) and rerun the build,\n"
            "       or build here with `mise run deploy:local`"
        )


def switch(server: Server, commit: str) -> None:
    # One-time: a server checkout from before deploy-server.sh existed has none
    # to run, so bring it up to the commit being deployed first. Every later
    # deploy leaves moving the checkout to deploy-server.sh, which does it
    # under its lock.
    if not server.succeeds("test", "-x", "deploy-server.sh", cwd=True):
        step(
            f"Bringing the server checkout up to {commit[:12]} for its first deploy-server.sh..."
        )
        server.shell(
            f"git fetch --quiet origin && git merge --ff-only --quiet {commit}",
            cwd=True,
        )
    step(f"Switching the server to typo-blue:{commit}...")
    server.run("./deploy-server.sh", commit, cwd=True)


def remove_local_images(commit: str) -> None:
    """The server has the image now, and this copy only existed to be sent
    there. Keeping the one just deployed makes a retry cheap; the build cache
    that makes the next build fast is separate and stays."""
    for tag in output(
        "docker", "image", "ls", "typo-blue", "--format", "{{.Tag}}"
    ).split():
        if tag != commit:
            run("docker", "rmi", f"typo-blue:{tag}", check=False, quiet=True)


def deploy(build_here: bool = False) -> None:
    if build_here:
        ensure_docker()
    elif not shutil.which("gh"):
        raise DeployError(
            "gh is not installed, and it is how this waits for GitHub Actions to\n"
            "       build the image: run `mise install`, or build here with\n"
            "       `mise run deploy:local`"
        )
    elif not succeeds("gh", "auth", "status"):
        raise DeployError(
            "gh is not logged in, and it is how this waits for GitHub Actions to\n"
            "       build the image: run `gh auth login`, or build here with\n"
            "       `mise run deploy:local`"
        )
    commit = fetch_main()
    server = Server(DEPLOY_HOST)
    if build_here:
        build_and_ship(server, commit)
    else:
        pull_image(server, commit)
    check_public_settings(server, commit)
    switch(server, commit)
    if build_here:
        remove_local_images(commit)


def deploy_local() -> None:
    deploy(build_here=True)


COMMANDS = {"deploy": deploy, "deploy:local": deploy_local}


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(f"usage: {sys.argv[0]} {{{'|'.join(COMMANDS)}}}", file=sys.stderr)
        return 2
    command = COMMANDS[sys.argv[1]]
    BUILD_DIR.parent.mkdir(parents=True, exist_ok=True)
    # One at a time: two deploys would share the build checkout.
    try:
        LOCK_DIR.mkdir()
    except FileExistsError:
        print(
            f"ERROR: another deploy is in progress (remove {LOCK_DIR} if it is not)",
            file=sys.stderr,
        )
        return 1
    try:
        command()
        return 0
    except DeployError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("ERROR: interrupted", file=sys.stderr)
        return 130
    finally:
        LOCK_DIR.rmdir()


if __name__ == "__main__":
    sys.exit(main())
