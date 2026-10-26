"""Guardas de Git: sin push a main, sin force, sin saltarse hooks."""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

PROTECTED_BRANCHES = {"main", "master"}
WORK_BRANCH_RE = re.compile(r"^(feat|fix|chore|docs|refactor|test|perf|security)/(HU|ING|TASK)-[A-Za-z0-9-]+$")
SPRINT_BRANCH_RE = re.compile(r"^sprint/S\d{2,}$")
FORBIDDEN_ARGS = ("--force", "-f", "--no-verify", "--no-gpg-sign")


@dataclass
class GitState:
    branch: str
    commit: str
    dirty: bool
    changed_files: list[str]


class GitError(RuntimeError):
    pass


def _run(args: list[str], cwd: Path) -> str:
    result = subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        raise GitError((result.stderr or result.stdout).strip() or f"git {' '.join(args)} falló")
    return result.stdout.strip()


def read_git_state(cwd: Path | str = ".") -> GitState:
    root = Path(cwd)
    branch = _run(["branch", "--show-current"], root) or "(detached)"
    commit = _run(["rev-parse", "HEAD"], root)
    porcelain = _run(["status", "--porcelain"], root)
    changed = [line[3:] for line in porcelain.splitlines() if line.strip()]
    return GitState(branch=branch, commit=commit, dirty=bool(changed), changed_files=changed)


def is_ancestor(commit: str, cwd: Path | str = ".", descendant: str = "HEAD") -> bool:
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", commit, descendant],
        cwd=str(cwd),
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def validate_work_branch(branch: str) -> None:
    if branch in PROTECTED_BRANCHES:
        raise GitError(f"No se trabaja directamente sobre {branch}.")
    if branch.startswith("sprint/"):
        raise GitError("Las ramas sprint/* solo integran PRs; no se commitea en ellas.")
    if not WORK_BRANCH_RE.match(branch):
        raise GitError(
            "Rama de trabajo inválida. Formato: <tipo>/HU-<slug>-<nn> "
            "(tipos: feat, fix, chore, docs, refactor, test, perf, security)."
        )


def validate_sprint_branch(branch: str) -> None:
    if not SPRINT_BRANCH_RE.match(branch):
        raise GitError("Rama de sprint inválida. Formato: sprint/S<nn>.")


def assert_safe_command(argv: list[str]) -> None:
    joined = " ".join(argv)
    for forbidden in FORBIDDEN_ARGS:
        if forbidden in argv or forbidden in joined:
            raise GitError(f"Argumento prohibido: {forbidden}")
    if argv[:2] == ["push", "origin"] and len(argv) > 2:
        target = argv[2].split(":")[-1]
        if target in PROTECTED_BRANCHES or target.startswith("sprint/"):
            raise GitError(f"Push directo prohibido a {target}; abre un PR.")
    if "push" in argv and ("--force" in argv or "-f" in argv or "--force-with-lease" in argv):
        raise GitError("Force push prohibido.")
    if "merge" in argv and "main" in argv:
        raise GitError("El merge a main requiere PR y aprobación humana.")


def changed_files_since(base: str, cwd: Path | str = ".") -> list[str]:
    output = _run(["diff", "--name-only", f"{base}..HEAD"], Path(cwd))
    return [line for line in output.splitlines() if line.strip()]
