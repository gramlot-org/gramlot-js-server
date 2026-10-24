"""Prepare the public core and examples source for coordinated workspace verification."""
from pathlib import Path
import os
import subprocess
ROOT = Path(__file__).resolve().parents[1]
DEPENDENCIES = ROOT / "build/source-dependencies"
SOURCE_REF = os.environ.get("GRAMLOT_SOURCE_REF", "main")
def run(*args, cwd):
    subprocess.run(args, cwd=cwd, check=True)
def checkout(name):
    path = DEPENDENCIES / name
    if path.exists():
        run("git", "fetch", "--depth=1", "origin", SOURCE_REF, cwd=path)
        run("git", "switch", "--detach", "FETCH_HEAD", cwd=path)
    else:
        run("git", "clone", "--depth=1", f"--branch={SOURCE_REF}",
            f"https://github.com/gramlot-org/{name}.git", str(path), cwd=ROOT)
    run("git", "log", "-1", "--format=%H %s", cwd=path)
    return path
def main():
    DEPENDENCIES.mkdir(parents=True, exist_ok=True)
    core = checkout("gramlot")
    examples = checkout("gramlot-examples")
    install = ("npm", "install", "--install-links", "--ignore-scripts", "--package-lock=false", "--no-audit", "--no-fund")
    run(*install, cwd=core / "js")
    run(*install, cwd=core / "tools/gramlot-builder")
    run("npm", "run", "build", cwd=core / "js")
    core_package = f"@gramlot/gramlot@file:{core / 'js'}"
    run(*install, "--no-save", core_package,
        f"@gramlot/builder@file:{core / 'tools/gramlot-builder'}", cwd=examples)
    run("npm", "run", "build", cwd=examples)
    run(*install, "--no-save", core_package,
        f"@gramlot/gramlot-examples@file:{examples}",
        f"@gramlot/builder@file:{core / 'tools/gramlot-builder'}", "playwright", cwd=ROOT)
if __name__ == "__main__":
    main()
