"""Utilidades de prueba: repositorio git temporal y política aislada."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

CORE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CORE / "src"))

from nexus_engineering.policy import DEFAULT_POLICY, Policy  # noqa: E402
from nexus_engineering.store import StateStore  # noqa: E402


def make_repo(root: Path) -> Path:
    repo = root / "repo"
    repo.mkdir(parents=True, exist_ok=True)
    git(repo, "init", "-q")
    git(repo, "config", "user.email", "tests@nexus.local")
    git(repo, "config", "user.name", "Nexus Tests")
    (repo / "lib").mkdir(exist_ok=True)
    (repo / "lib" / "a.ts").write_text("export const a = 1;\n", encoding="utf-8")
    git(repo, "add", ".")
    git(repo, "commit", "-q", "-m", "init")
    return repo


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=str(repo), check=True, capture_output=True, text=True)


def make_policy(root: Path) -> Policy:
    data = {**DEFAULT_POLICY, "pause_file": str(root / "PAUSA")}
    return Policy(data=data)


def make_store(root: Path) -> StateStore:
    return StateStore(root / "state")
