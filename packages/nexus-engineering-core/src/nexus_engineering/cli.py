"""CLI compartida por OpenCode, Claude Code, n8n y humanos.

Uso:
    python3 -m nexus_engineering --help
    python3 -m nexus_engineering status --json
    python3 -m nexus_engineering next
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from . import __version__
from .domain import PolicyError, TransitionError
from .health import health, validate_config, validate_state
from .knowledge import KnowledgeHub, graphify_status
from .orchestrator import Orchestrator, run_command
from .policy import Policy
from .security import assert_no_secrets, redact
from .store import StateStore
from .workflows import ALLOWED_WORKFLOWS, WorkflowLedger


def _print(payload: Any, as_json: bool) -> None:
    if as_json or isinstance(payload, (dict, list)):
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(payload)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="nexus-eng",
        description="NEXUS Engineering Intelligence Platform — núcleo agnóstico de cliente",
    )
    parser.add_argument("--state-dir", default="", help="Directorio de estado (por defecto .product-team/state)")
    parser.add_argument("--repo", default=".", help="Raíz del repositorio")
    parser.add_argument("--json", action="store_true", help="Salida JSON")
    parser.add_argument("--version", action="version", version=f"nexus-engineering {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="Inicializa el estado persistente")
    sub.add_parser("status", help="Resumen del equipo")
    sub.add_parser("next", help="Siguiente tarea ejecutable")
    sub.add_parser("readiness", help="Clasifica tareas listas/bloqueadas/en espera")
    sub.add_parser("health", help="Comprobaciones de salud")
    sub.add_parser("validate", help="Valida estado y configuración")

    route = sub.add_parser("route", help="Elige el agente especialista")
    route.add_argument("--tags", nargs="*", default=[])
    route.add_argument("--paths", nargs="*", default=[])
    route.add_argument("--discipline", default="engineering")

    loop = sub.add_parser("loop", help="Muestra el ciclo de trabajo de una disciplina")
    loop.add_argument("--discipline", default="engineering")

    add = sub.add_parser("add-task", help="Registra una tarea canónica")
    add.add_argument("--id", default="")
    add.add_argument("--title", required=True)
    add.add_argument("--story", default="")
    add.add_argument("--sprint", default="")
    add.add_argument("--discipline", default="engineering")
    add.add_argument("--priority", type=int, default=2)
    add.add_argument("--depends-on", nargs="*", default=[])
    add.add_argument("--agent", default="")
    add.add_argument("--tags", nargs="*", default=[])
    add.add_argument("--paths", nargs="*", default=[])
    add.add_argument("--acceptance", nargs="*", default=[])
    add.add_argument("--max-attempts", type=int, default=0)
    add.add_argument("--origin", default="cli")

    assign = sub.add_parser("assign", help="Asigna agente según política de enrutamiento")
    assign.add_argument("task_id")

    start = sub.add_parser("start", help="Inicia una tarea (abre intento)")
    start.add_argument("task_id")
    start.add_argument("--agent", default="")
    start.add_argument("--branch", default="")
    start.add_argument("--origin", default="cli")
    start.add_argument("--allow-dirty", action="store_true")

    retry = sub.add_parser("retry", help="Reintenta tras revisión/fallo (límite aplicado)")
    retry.add_argument("task_id")
    retry.add_argument("--agent", default="")
    retry.add_argument("--reason", default="")

    unblock = sub.add_parser("unblock", help="Desbloquea una tarea con motivo")
    unblock.add_argument("task_id")
    unblock.add_argument("--reason", required=True)

    gate = sub.add_parser("gate", help="Registra un resultado de compuerta")
    gate.add_argument("task_id")
    gate.add_argument("--gate", required=True)
    gate.add_argument("--passed", action="store_true")
    gate.add_argument("--evidence", nargs="*", default=[])
    gate.add_argument("--actor", default="ci")

    verify = sub.add_parser("verify", help="Ejecuta compuertas reales y registra evidencia")
    verify.add_argument("task_id")
    verify.add_argument("--gate", default="required", help="nombre de compuerta, required o all")
    verify.add_argument("--timeout", type=int, default=1800)

    review_req = sub.add_parser("request-review", help="Solicita QA y revisión senior")
    review_req.add_argument("task_id")

    review_plan = sub.add_parser("review-plan", help="Revisores independientes sugeridos")
    review_plan.add_argument("task_id")

    review = sub.add_parser("review", help="Registra veredicto independiente")
    review.add_argument("task_id")
    review.add_argument("--kind", required=True, choices=["qa", "senior_review"])
    review.add_argument("--verdict", required=True, choices=["approved", "changes_requested", "blocked"])
    review.add_argument("--reviewer", required=True)
    review.add_argument("--summary", default="")
    review.add_argument("--evidence", nargs="*", default=[])

    ci = sub.add_parser("ci-green", help="Registra CI verde")
    ci.add_argument("task_id")
    ci.add_argument("--evidence", nargs="*", default=[])

    merge = sub.add_parser("merge", help="Marca integrada en sprint (no hace merge git)")
    merge.add_argument("task_id")

    block = sub.add_parser("block", help="Bloquea una tarea")
    block.add_argument("task_id")
    block.add_argument("--reason", required=True)

    fail = sub.add_parser("fail", help="Registra fallo de implementación")
    fail.add_argument("task_id")
    fail.add_argument("--reason", required=True)

    checkpoint = sub.add_parser("checkpoint", help="Guarda checkpoint reanudable")
    checkpoint.add_argument("task_id")
    checkpoint.add_argument("--agent", required=True)
    checkpoint.add_argument("--stage", default="")
    checkpoint.add_argument("--files", nargs="*", default=[])
    checkpoint.add_argument("--tests", nargs="*", default=[])
    checkpoint.add_argument("--failures", nargs="*", default=[])
    checkpoint.add_argument("--next-action", default="")
    checkpoint.add_argument("--client", default="cli")

    recover = sub.add_parser("recover", help="Comprueba si una tarea se puede reanudar")
    recover.add_argument("task_id")
    recover.add_argument("--client", default="cli")

    pause = sub.add_parser("pause", help="Activa la pausa del equipo")
    pause.add_argument("--reason", default="pausa solicitada por el usuario")
    sub.add_parser("unpause", help="Retira el archivo de pausa")

    report = sub.add_parser("report", help="Genera reporte markdown")
    report.add_argument("--sprint", default="")
    report.add_argument("--out", default="")

    sprint = sub.add_parser("sprint-add", help="Registra un sprint")
    sprint.add_argument("sprint_id")
    sprint.add_argument("--goal", required=True)
    sprint.add_argument("--branch", default="")

    sprint_close = sub.add_parser(
        "sprint-close", help="Cierra un sprint con todas sus tareas integradas"
    )
    sprint_close.add_argument("sprint_id")

    skills_parser = sub.add_parser("skills", help="Registro de skills y herramientas externas")
    skills_sub = skills_parser.add_subparsers(dest="skills_command", required=True)
    skills_sub.add_parser("list", help="Lista entradas del registro")
    skills_sub.add_parser("summary", help="Resumen por estado y tipo")
    skills_verify = skills_sub.add_parser("verify", help="Verifica huellas, licencias y revisión")
    skills_verify.add_argument("--write", action="store_true", help="Recalcula content_hash de skills activas")

    knowledge = sub.add_parser("knowledge", help="Knowledge Hub")
    ksub = knowledge.add_subparsers(dest="knowledge_command", required=True)
    kadd = ksub.add_parser("add")
    kadd.add_argument("--title", required=True)
    kadd.add_argument("--kind", required=True)
    kadd.add_argument("--location", default="")
    kadd.add_argument("--url", default="")
    kadd.add_argument("--provenance", required=True)
    kadd.add_argument("--tags", nargs="*", default=[])
    kadd.add_argument("--module", default="")
    kadd.add_argument("--confidence", default="medium", choices=["high", "medium", "low"])
    kadd.add_argument("--notes", default="")
    klist = ksub.add_parser("list")
    klist.add_argument("--status", default="")
    kshow = ksub.add_parser("show")
    kshow.add_argument("source_id")
    ksearch = ksub.add_parser("search")
    ksearch.add_argument("query")
    ksearch.add_argument("--limit", type=int, default=10)
    ksync = ksub.add_parser("sync")
    ksync.add_argument("--adapter", default="local")
    ksync.add_argument("--source", default="")
    ksub.add_parser("history")
    ksub.add_parser("graphify-status")

    workflow = sub.add_parser("workflow-event", help="Registra evento idempotente de n8n")
    workflow.add_argument("--workflow", required=True, choices=sorted(ALLOWED_WORKFLOWS))
    workflow.add_argument("--event", required=True)
    workflow.add_argument("--idempotency-key", required=True)
    workflow.add_argument("--detail", default="")
    sub.add_parser("workflow-history")

    serve = sub.add_parser("serve", help="Arranca el puente HTTP autenticado para n8n")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8787)

    return parser


def main(argv: list[str] | None = None) -> int:
    raw = list(sys.argv[1:] if argv is None else argv)
    # Permite `nexus-eng status --json` además de `nexus-eng --json status`.
    if "--json" in raw:
        raw = ["--json"] + [item for item in raw if item != "--json"]
    args = build_parser().parse_args(raw)
    store = StateStore(args.state_dir or None)
    orch = Orchestrator(store=store, policy=Policy.load(), repo=args.repo)
    hub = KnowledgeHub(store=store, repo=args.repo)
    ledger = WorkflowLedger(store=store)
    as_json = args.json

    try:
        if args.command == "init":
            _print(orch.bootstrap(), as_json)
        elif args.command == "status":
            _print(orch.status(), as_json)
        elif args.command == "next":
            result = orch.next_task()
            _print(result, as_json)
            return 0 if result["state"] == "ready" else 1
        elif args.command == "readiness":
            _print(orch.readiness(), as_json)
        elif args.command == "health":
            report = health(orch, args.repo)
            _print(report, as_json)
            return 0 if report["ok"] else 1
        elif args.command == "validate":
            state = validate_state(orch)
            config = validate_config(args.repo)
            payload = {"state": state, "config": config, "ok": state["ok"] and config["ok"]}
            _print(payload, as_json)
            return 0 if payload["ok"] else 1
        elif args.command == "route":
            agent, reason = orch.policy.route(args.tags, args.paths, args.discipline)
            _print({"agent": agent, "reason": reason}, as_json)
        elif args.command == "loop":
            from .domain import loop_stages

            _print({"discipline": args.discipline, "stages": list(loop_stages(args.discipline))}, as_json)
        elif args.command == "add-task":
            payload = {
                "id": args.id,
                "title": args.title,
                "story": args.story,
                "sprint": args.sprint,
                "discipline": args.discipline,
                "priority": args.priority,
                "depends_on": args.depends_on,
                "agent": args.agent,
                "tags": args.tags,
                "paths": args.paths,
                "acceptance": args.acceptance,
                "origin": args.origin,
            }
            if args.max_attempts:
                payload["max_attempts"] = args.max_attempts
            _print(orch.add_task(payload).to_dict(), as_json)
        elif args.command == "assign":
            _print(orch.assign(args.task_id), as_json)
        elif args.command == "start":
            _print(
                orch.start_task(
                    args.task_id,
                    agent=args.agent or None,
                    branch=args.branch,
                    origin=args.origin,
                    allow_dirty=args.allow_dirty,
                ),
                as_json,
            )
        elif args.command == "retry":
            _print(orch.retry(args.task_id, agent=args.agent or None, reason=args.reason), as_json)
        elif args.command == "unblock":
            _print(orch.unblock(args.task_id, args.reason), as_json)
        elif args.command == "gate":
            _print(
                orch.record_gate(
                    args.task_id, args.gate, args.passed, evidence=args.evidence, actor=args.actor
                ),
                as_json,
            )
            return 0 if args.passed else 2
        elif args.command == "verify":
            gates = orch.policy.gates
            if args.gate == "required":
                names = orch.policy.required_gates()
            elif args.gate == "all":
                names = list(gates)
            else:
                names = [args.gate]
            results = []
            ok = True
            for name in names:
                if name not in gates:
                    raise ValueError(f"Compuerta desconocida: {name}")
                result = run_command(gates[name]["command"], cwd=args.repo, timeout=args.timeout)
                orch.record_gate(
                    args.task_id,
                    name,
                    result["passed"],
                    evidence=[result["command"], f"exit={result['returncode']}", result["tail"][-400:]],
                    actor="local-gate",
                )
                results.append({"gate": name, **{k: v for k, v in result.items() if k != "tail"}})
                if not result["passed"]:
                    ok = False
                    break
            _print({"task": args.task_id, "passed": ok, "gates": results}, True)
            return 0 if ok else 2
        elif args.command == "request-review":
            _print(orch.request_review(args.task_id), as_json)
        elif args.command == "review-plan":
            _print(orch.review_plan(args.task_id), as_json)
        elif args.command == "review":
            _print(
                orch.record_review(
                    args.task_id,
                    kind=args.kind,
                    verdict=args.verdict,
                    reviewer=args.reviewer,
                    summary=args.summary,
                    evidence=args.evidence,
                ),
                as_json,
            )
        elif args.command == "ci-green":
            _print(orch.mark_ci_green(args.task_id, evidence=args.evidence), as_json)
        elif args.command == "merge":
            _print(orch.mark_merged(args.task_id), as_json)
        elif args.command == "block":
            _print(orch.block(args.task_id, args.reason), as_json)
        elif args.command == "fail":
            _print(orch.fail(args.task_id, args.reason), as_json)
        elif args.command == "checkpoint":
            checkpoint = orch.checkpoint(
                args.task_id,
                agent=args.agent,
                stage=args.stage,
                files=args.files,
                tests=args.tests,
                failures=args.failures,
                next_action=args.next_action,
                client=args.client,
            )
            _print(checkpoint.to_dict(), as_json)
        elif args.command == "recover":
            result = orch.recover(args.task_id, client=args.client)
            _print(result, as_json)
            return 0 if result["state"] in {"resumable", "no_checkpoint"} else 2
        elif args.command == "pause":
            _print(orch.pause(args.reason), as_json)
        elif args.command == "unpause":
            _print(orch.unpause(), as_json)
        elif args.command == "report":
            text = orch.report(args.sprint)
            if args.out:
                target = Path(args.out)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(text, encoding="utf-8")
                _print({"written": str(target), "bytes": len(text)}, as_json)
            else:
                print(text)
        elif args.command == "sprint-add":
            _print(orch.add_sprint(args.sprint_id, args.goal, args.branch).to_dict(), as_json)
        elif args.command == "sprint-close":
            _print(orch.close_sprint(args.sprint_id), as_json)
        elif args.command == "skills":
            from . import skills as skills_registry

            path = Path(args.repo) / ".product-team" / "skills-registry.json"
            registry = skills_registry.load_registry(path)
            if args.skills_command == "list":
                _print(
                    [
                        {
                            "id": item.get("id"),
                            "kind": item.get("kind"),
                            "status": item.get("status"),
                            "version": item.get("version"),
                            "license": item.get("license"),
                        }
                        for item in registry.get("skills", [])
                    ],
                    as_json,
                )
            elif args.skills_command == "summary":
                _print(skills_registry.summarize(registry), as_json)
            elif args.skills_command == "verify":
                if args.write:
                    registry = skills_registry.update_hashes(registry, args.repo)
                    with open(path, "w", encoding="utf-8") as handle:
                        json.dump(registry, handle, ensure_ascii=False, indent=2)
                        handle.write("\n")
                report = skills_registry.validate_registry(registry, args.repo)
                _print(report, as_json)
                return 0 if report["ok"] else 1
        elif args.command == "knowledge":
            if args.knowledge_command == "add":
                _print(
                    hub.add(
                        title=args.title,
                        kind=args.kind,
                        location=args.location,
                        url=args.url,
                        provenance=args.provenance,
                        tags=args.tags,
                        module=args.module,
                        confidence=args.confidence,
                        notes=args.notes,
                    ),
                    as_json,
                )
            elif args.knowledge_command == "list":
                _print(hub.list_sources(args.status), as_json)
            elif args.knowledge_command == "show":
                _print(hub.show(args.source_id), as_json)
            elif args.knowledge_command == "search":
                _print(hub.search(args.query, args.limit), as_json)
            elif args.knowledge_command == "sync":
                _print(hub.sync(args.adapter, args.source), as_json)
            elif args.knowledge_command == "history":
                _print(hub.sync_history(), as_json)
            elif args.knowledge_command == "graphify-status":
                _print(graphify_status(args.repo), as_json)
        elif args.command == "workflow-event":
            _print(
                ledger.register(args.workflow, args.event, args.idempotency_key, args.detail), as_json
            )
        elif args.command == "workflow-history":
            _print(ledger.history(), as_json)
        elif args.command == "serve":
            import os

            from .server import create_server

            token = os.environ.get("NEXUS_WEBHOOK_TOKEN", "")
            server = create_server(
                orch, ledger, token, host=args.host, port=args.port
            )
            print(f"nexus-eng escuchando en http://{args.host}:{server.server_address[1]} (token requerido)")
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                print("detenido")
            finally:
                server.server_close()
        else:  # pragma: no cover
            raise ValueError(f"Comando no implementado: {args.command}")
        return 0
    except (PolicyError, TransitionError, ValueError, KeyError, TimeoutError, FileNotFoundError) as exc:
        message = redact(str(exc))
        print(json.dumps({"error": message, "type": type(exc).__name__}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
