"""Salud y validación del sistema, con evidencias reales (sin inventar estados)."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

from .domain import SCHEMA_VERSION, TRANSITIONS
from .gitguard import GitError, read_git_state
from .knowledge import graphify_status, resolve_graphify_binary
from .orchestrator import Orchestrator


def validate_state(orch: Orchestrator) -> dict[str, Any]:
    problems: list[str] = []
    warnings: list[str] = []
    store = orch.store

    meta = store.read_json(store.root / "meta.json", {})
    if meta.get("schema_version") != SCHEMA_VERSION:
        problems.append(
            f"schema_version de estado {meta.get('schema_version')} != {SCHEMA_VERSION}"
        )

    tasks = store.load_tasks()
    ids = set(tasks)
    for task in tasks.values():
        if task.status not in TRANSITIONS:
            problems.append(f"{task.id}: estado desconocido {task.status}")
        if task.depends_on and task.is_dependency_satisfied(tasks) and task.status == "pending":
            warnings.append(f"{task.id}: dependencias satisfechas; debería promoverse a ready")
        for dep in task.depends_on:
            if dep not in ids:
                problems.append(f"{task.id}: dependencia inexistente {dep}")
            if dep == task.id:
                problems.append(f"{task.id}: depende de sí misma")
        if task.attempts > task.max_attempts:
            problems.append(f"{task.id}: intentos {task.attempts} > máximo {task.max_attempts}")
        if task.status == "merged":
            if not any(v.kind == "ci" and v.verdict == "passed" for v in task.verification):
                problems.append(f"{task.id}: merged sin CI verde registrado")
            if not any(r.kind == "qa" and r.verdict == "approved" for r in task.reviews):
                problems.append(f"{task.id}: merged sin QA aprobado")
        if task.status in {"verified", "merged"}:
            implementers = {task.implementer, task.agent}
            for review in task.reviews:
                if review.verdict == "approved" and review.reviewer in implementers:
                    problems.append(f"{task.id}: revisión aprobada por el propio implementador")

    # Ciclos de dependencias
    color: dict[str, int] = {}

    def visit(node: str, trail: list[str]) -> None:
        if color.get(node) == 1:
            problems.append(f"ciclo de dependencias: {' -> '.join(trail + [node])}")
            return
        if color.get(node) == 2 or node not in tasks:
            return
        color[node] = 1
        for dep in tasks[node].depends_on:
            visit(dep, trail + [node])
        color[node] = 2

    for task_id in tasks:
        visit(task_id, [])

    payload = store.read_json(store.knowledge_dir / "catalog.json", {"sources": []})
    for source in payload.get("sources", []):
        if not source.get("provenance"):
            problems.append(f"fuente {source.get('id')}: sin procedencia")
        if not source.get("content_hash"):
            problems.append(f"fuente {source.get('id')}: sin huella de contenido")

    return {"ok": not problems, "problems": problems, "warnings": warnings}


def health(orch: Orchestrator, repo: Path | str = ".") -> dict[str, Any]:
    root = Path(repo)
    checks: dict[str, Any] = {}

    try:
        git_state = read_git_state(root)
        checks["git"] = {
            "ok": git_state.branch not in {"main", "master"},
            "branch": git_state.branch,
            "dirty": git_state.dirty,
            "changed_files": len(git_state.changed_files),
        }
    except GitError as exc:
        checks["git"] = {"ok": False, "error": str(exc)}

    checks["pause"] = {
        "active": orch.is_paused(),
        "file": str(orch.policy.pause_file),
    }

    tools = {}
    for name in ("opencode", "claude", "node", "pnpm", "python3", "git", "gh", "n8n", "docker"):
        tools[name] = shutil.which(name) or ""
    # Graphify puede vivir en el venv local del repositorio, no solo en PATH.
    tools["graphify"] = resolve_graphify_binary(root)
    checks["tooling"] = {name: {"found": bool(path), "path": path} for name, path in tools.items()}

    checks["graphify"] = graphify_status(root)
    checks["knowledge"] = {
        "sources": len(
            orch.store.read_json(orch.store.knowledge_dir / "catalog.json", {"sources": []}).get(
                "sources", []
            )
        )
    }
    checks["n8n"] = {
        "installed": bool(shutil.which("n8n")) or (root / "node_modules" / ".bin" / "n8n").exists(),
        "workflows_dir": str(root / "integrations" / "n8n" / "workflows"),
        "workflows_versioned": len(list((root / "integrations" / "n8n" / "workflows").glob("*.json")))
        if (root / "integrations" / "n8n" / "workflows").exists()
        else 0,
    }
    checks["validation"] = validate_state(orch)

    ok = (
        checks["git"].get("ok", False)
        and checks["validation"]["ok"]
        and checks["knowledge"]["sources"] >= 0
    )
    return {"ok": ok, "checks": checks}


def validate_config(root: Path | str = ".") -> dict[str, Any]:
    base = Path(root)
    problems: list[str] = []
    warnings: list[str] = []
    required = [
        ".product-team/workflow-policy.json",
        ".product-team/agent-registry.json",
        ".product-team/skills-registry.json",
        ".product-team/schemas/task.schema.json",
        "opencode.json",
        ".opencode/agents/engineering-manager.md",
        ".claude/agents/engineering-manager.md",
        "integrations/n8n/README.md",
        "integrations/n8n/workflows/A-nueva-solicitud.json",
    ]
    for relative in required:
        if not (base / relative).exists():
            problems.append(f"falta {relative}")
    registry_path = base / ".product-team/agent-registry.json"
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        agents = registry.get("agents", [])
        if len(agents) < 38:
            problems.append(f"el registro declara {len(agents)} agentes; se esperan al menos 38")
        teams = {agent.get("team") for agent in agents}
        for team in ("engineering", "studio"):
            if team not in teams:
                problems.append(f"falta el equipo {team} en el registro de agentes")
        studio = [agent for agent in agents if agent.get("team") == "studio"]
        if len(studio) < 20:
            problems.append(f"Nexus Thrive Studio declara {len(studio)} perfiles; se esperan 20")
        ids = [agent.get("id") for agent in agents]
        if len(ids) != len(set(ids)):
            problems.append("ids de agente duplicados")
        for agent in agents:
            for key in ("id", "description", "mode"):
                if not agent.get(key):
                    problems.append(f"agente {agent.get('id', '?')}: falta {key}")
        opencode_agents = {path.stem for path in (base / ".opencode" / "agents").glob("*.md")}
        claude_agents = {path.stem for path in (base / ".claude" / "agents").glob("*.md")}
        missing_oc = sorted(set(ids) - opencode_agents)
        missing_cc = sorted(set(ids) - claude_agents)
        if missing_oc:
            problems.append(f"faltan agentes OpenCode: {missing_oc}")
        if missing_cc:
            problems.append(f"faltan agentes Claude Code: {missing_cc}")
    skills = sorted(path.name for path in (base / "skills").glob("*/SKILL.md"))
    if len(skills) < 17:
        problems.append(f"se esperan 17 skills canónicos; hay {len(skills)}")
    from .skills import RegistryError, load_registry, validate_registry

    try:
        skills_registry = load_registry(base / ".product-team" / "skills-registry.json")
        skills_report = validate_registry(skills_registry, base)
        problems.extend(skills_report["problems"])
        warnings.extend(skills_report["warnings"])
    except RegistryError as exc:
        problems.append(str(exc))

    commands = sorted((base / "commands").glob("*.md"))
    if len(commands) < 7:
        problems.append(f"se esperan 7 comandos; hay {len(commands)}")

    try:
        import jsonschema  # type: ignore
    except ImportError:
        jsonschema = None  # type: ignore
        warnings.append("jsonschema no instalado: se omite la validación estructural por esquema")

    if jsonschema is not None:
        from .store import StateStore

        store = StateStore(Path(os.environ.get("NEXUS_STATE_DIR") or (base / ".product-team" / "state")))
        schemas = base / ".product-team" / "schemas"
        if store.tasks_file.exists() and (schemas / "task.schema.json").exists():
            task_schema = json.loads((schemas / "task.schema.json").read_text(encoding="utf-8"))
            for task in store.load_tasks().values():
                try:
                    jsonschema.validate(task.to_dict(), task_schema)
                except jsonschema.ValidationError as exc:
                    problems.append(f"tarea {task.id}: {exc.message}")
        knowledge_schema_path = schemas / "knowledge-source.schema.json"
        if knowledge_schema_path.exists():
            knowledge_schema = json.loads(knowledge_schema_path.read_text(encoding="utf-8"))
            for source in store.read_json(
                store.knowledge_dir / "catalog.json", {"sources": []}
            ).get("sources", []):
                try:
                    jsonschema.validate(source, knowledge_schema)
                except jsonschema.ValidationError as exc:
                    problems.append(f"fuente {source.get('id')}: {exc.message}")

    for workflow in sorted((base / "integrations" / "n8n" / "workflows").glob("*.json")):
        try:
            data = json.loads(workflow.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            problems.append(f"{workflow.name}: JSON inválido ({exc})")
            continue
        if "nodes" not in data or not data["nodes"]:
            problems.append(f"{workflow.name}: sin nodos")
        if "connections" not in data:
            problems.append(f"{workflow.name}: sin conexiones")
        text = workflow.read_text(encoding="utf-8")
        for marker in ("sk-", "Bearer eyJ", "postgres://user:password"):
            if marker in text:
                problems.append(f"{workflow.name}: posible secreto embebido ({marker})")
    return {"ok": not problems, "problems": problems, "warnings": warnings}


def run_health_checks(orch: Orchestrator, repo: Path | str = ".") -> int:
    report = health(orch, repo)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1
