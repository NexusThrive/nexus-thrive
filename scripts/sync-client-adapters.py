#!/usr/bin/env python3
"""Sincroniza skills y comandos canónicos a los adaptadores de cada cliente.

Fuente única:
    skills/<id>/SKILL.md
    commands/<id>.md

Destinos:
    .opencode/skills/<id>/...   .opencode/commands/<id>.md
    .claude/skills/<id>/...     .claude/commands/<id>.md

No borra skills preexistentes de otros plugins (por ejemplo Prisma).
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
COMMANDS = ROOT / "commands"
TARGETS = [
    (ROOT / ".opencode" / "skills", ROOT / ".opencode" / "commands"),
    (ROOT / ".claude" / "skills", ROOT / ".claude" / "commands"),
]


def sync_skills(target: Path) -> int:
    count = 0
    for skill in sorted(SKILLS.iterdir()):
        source = skill / "SKILL.md"
        if not skill.is_dir() or not source.exists():
            continue
        destination = target / skill.name
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(skill, destination, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        count += 1
    return count


def sync_commands(target: Path) -> int:
    count = 0
    target.mkdir(parents=True, exist_ok=True)
    for command in sorted(COMMANDS.glob("*.md")):
        shutil.copy2(command, target / command.name)
        count += 1
    return count


def main() -> int:
    if not SKILLS.exists() or not COMMANDS.exists():
        print("ERROR: faltan skills/ o commands/", file=sys.stderr)
        return 1
    total_skills = total_commands = 0
    for skills_target, commands_target in TARGETS:
        total_skills += sync_skills(skills_target)
        total_commands += sync_commands(commands_target)
    print(f"Sincronizados {total_skills} skills y {total_commands} comandos en 2 clientes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
