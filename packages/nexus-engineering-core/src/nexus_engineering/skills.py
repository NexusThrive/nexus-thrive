"""Registro y verificación de skills, plugins y herramientas externas.

La instalación no basta: una skill activa debe tener procedencia, licencia,
revisión de seguridad y una huella verificable. Este módulo no instala nada;
comprueba que lo declarado coincide con lo que existe en disco.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
ALLOWED_LICENSES = {
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "MPL-2.0",
    "proprietary",
    "unknown-reviewed",
    "Sustainable-Use-1.0",
}
KINDS = {"skill", "tool", "mcp", "platform"}
STATUSES = {"active", "installed", "evaluated", "deferred", "rejected"}
ACTIVE_STATUSES = {"active", "installed"}
REQUIRED_FIELDS = ("id", "kind", "status", "source", "license", "version")


class RegistryError(ValueError):
    """Registro de skills inválido."""


def load_registry(path: Path | str | None = None) -> dict[str, Any]:
    candidate = Path(path) if path else Path(".product-team/skills-registry.json")
    if not candidate.exists():
        raise RegistryError(f"No existe el registro de skills: {candidate}")
    with open(candidate, encoding="utf-8") as handle:
        return json.load(handle)


def content_hash(directory: Path) -> str:
    """SHA-256 estable del contenido de una skill (nombres + bytes)."""
    digest = hashlib.sha256()
    for path in sorted(directory.rglob("*")):
        if not path.is_file() or "__pycache__" in path.parts:
            continue
        relative = path.relative_to(directory).as_posix()
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


# Rutas donde un cliente descubre skills. ``.agents/skills`` es la carpeta
# compartida que usa el CLI de skills de Vercel; las otras dos son adaptadores
# generados desde ``skills/``.
SKILL_ADAPTERS = (".opencode/skills", ".claude/skills", ".agents/skills")


def _adapter_present(base: Path, skill_id: str, directory_name: str | None = None) -> bool:
    name = directory_name or skill_id
    return any(
        (base / adapter / name / "SKILL.md").exists() for adapter in SKILL_ADAPTERS
    )


def validate_registry(registry: dict[str, Any], repo: Path | str = ".") -> dict[str, Any]:
    base = Path(repo)
    problems: list[str] = []
    warnings: list[str] = []

    if registry.get("schema_version") != SCHEMA_VERSION:
        problems.append(
            f"schema_version {registry.get('schema_version')} != {SCHEMA_VERSION}"
        )
    entries = registry.get("skills", [])
    if not isinstance(entries, list):
        return {"ok": False, "problems": ["'skills' debe ser una lista"], "warnings": warnings}

    ids = [entry.get("id") for entry in entries]
    if len(ids) != len(set(ids)):
        problems.append("ids de skill duplicados")

    for entry in entries:
        skill_id = entry.get("id", "?")
        for field in REQUIRED_FIELDS:
            if not entry.get(field):
                problems.append(f"{skill_id}: falta {field}")
        if entry.get("kind") not in KINDS:
            problems.append(f"{skill_id}: kind inválido {entry.get('kind')!r}")
        if entry.get("status") not in STATUSES:
            problems.append(f"{skill_id}: status inválido {entry.get('status')!r}")
        if entry.get("license") not in ALLOWED_LICENSES:
            problems.append(f"{skill_id}: licencia no admitida {entry.get('license')!r}")

        active = entry.get("status") in ACTIVE_STATUSES
        if active:
            review = entry.get("security_review") or {}
            if review.get("status") != "approved":
                problems.append(f"{skill_id}: activa sin revisión de seguridad aprobada")
            if not review.get("reviewer") or not review.get("date"):
                problems.append(f"{skill_id}: revisión sin revisor o fecha")
            if not entry.get("provenance"):
                problems.append(f"{skill_id}: activa sin procedencia")
            if not entry.get("rollback"):
                problems.append(f"{skill_id}: activa sin procedimiento de rollback")
            if not entry.get("compatibility"):
                problems.append(f"{skill_id}: activa sin compatibilidad declarada")

        location = entry.get("location")
        if active and entry.get("kind") == "skill" and location:
            directory = base / location
            manifest = directory / "SKILL.md"
            if not manifest.exists():
                problems.append(f"{skill_id}: no existe {location}/SKILL.md")
                continue
            if not entry.get("content_hash"):
                warnings.append(f"{skill_id}: sin content_hash (ejecuta skills verify --write)")
            else:
                actual = content_hash(directory)
                if actual != entry["content_hash"]:
                    problems.append(
                        f"{skill_id}: huella distinta a la registrada "
                        f"(registrada {entry['content_hash'][:12]}, actual {actual[:12]})"
                    )
            if not _adapter_present(
                base, skill_id, Path(location).name if location else None
            ):
                warnings.append(f"{skill_id}: no está sincronizada en ningún adaptador de cliente")

        if entry.get("kind") in {"tool", "mcp", "platform"} and active:
            for field in ("function", "risks", "test"):
                if not entry.get(field):
                    problems.append(f"{skill_id}: herramienta activa sin {field}")
        if entry.get("status") == "rejected" and not entry.get("reason"):
            problems.append(f"{skill_id}: rechazada sin motivo documentado")

    return {"ok": not problems, "problems": problems, "warnings": warnings}


def summarize(registry: dict[str, Any]) -> dict[str, Any]:
    entries = registry.get("skills", [])
    by_status: dict[str, int] = {}
    by_kind: dict[str, int] = {}
    for entry in entries:
        status = entry.get("status", "?")
        kind = entry.get("kind", "?")
        by_status[status] = by_status.get(status, 0) + 1
        by_kind[kind] = by_kind.get(kind, 0) + 1
    return {
        "total": len(entries),
        "by_status": dict(sorted(by_status.items())),
        "by_kind": dict(sorted(by_kind.items())),
        "ids": [entry.get("id") for entry in entries],
    }


def update_hashes(registry: dict[str, Any], repo: Path | str = ".") -> dict[str, Any]:
    """Recalcula content_hash de las skills activas y devuelve el registro."""
    base = Path(repo)
    for entry in registry.get("skills", []):
        if entry.get("status") not in ACTIVE_STATUSES:
            continue
        location = entry.get("location")
        if entry.get("kind") != "skill" or not location:
            continue
        directory = base / location
        if (directory / "SKILL.md").exists():
            entry["content_hash"] = content_hash(directory)
    return registry
