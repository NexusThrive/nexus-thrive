"""Orquestador: elige la siguiente tarea, aplica límites y recupera estado."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any

from .domain import (
    TRANSITIONS,
    Checkpoint,
    Finding,
    PolicyError,
    Sprint,
    Task,
    TransitionError,
    new_id,
    normalize_discipline,
    summarize,
    utcnow,
    validate_transition_graph,
)
from .gitguard import GitError, is_ancestor, read_git_state, validate_work_branch
from .policy import Policy
from .security import redact
from .store import StateStore


class Orchestrator:
    def __init__(
        self,
        store: StateStore | None = None,
        policy: Policy | None = None,
        repo: Path | str = ".",
    ) -> None:
        self.store = store or StateStore()
        self.policy = policy or Policy.load()
        self.repo = Path(repo)
        validate_transition_graph()

    # ------------------------------------------------------------------ setup
    def bootstrap(self) -> dict[str, Any]:
        self.store.initialize()
        return {"state_dir": str(self.store.root), "initialized": True}

    # ----------------------------------------------------------------- pause
    @property
    def pause_file(self) -> Path:
        candidate = self.policy.pause_file
        return candidate if candidate.is_absolute() else self.repo / candidate

    def is_paused(self) -> bool:
        return self.pause_file.exists()

    # ------------------------------------------------------------------ queue
    def next_task(self) -> dict[str, Any]:
        tasks = self.store.load_tasks()
        if self.is_paused():
            active = [t for t in tasks.values() if t.status == "in_progress"]
            return {
                "state": "paused",
                "reason": f"Existe {self.pause_file}: no se inician historias nuevas.",
                "task": active[0].to_dict() if active else None,
            }
        ready: list[Task] = []
        for task in tasks.values():
            if task.status in {"pending", "ready"} and task.is_dependency_satisfied(tasks):
                ready.append(task)
        if not ready:
            pending = [t for t in tasks.values() if t.status in {"pending", "ready"}]
            blocking = {
                t.id: [d for d in t.depends_on if d not in tasks or tasks[d].status != "merged"]
                for t in pending
            }
            return {"state": "empty", "reason": "No hay tareas ejecutables.", "blockers": blocking}
        ready.sort(key=lambda t: (t.priority, t.created_at, t.id))
        chosen = ready[0]
        return {"state": "ready", "task": chosen.to_dict()}

    def readiness(self) -> dict[str, Any]:
        tasks = self.store.load_tasks()
        result: dict[str, list[str]] = {"ready": [], "blocked": [], "waiting": []}
        for task in tasks.values():
            if task.status in {"merged", "cancelled"}:
                continue
            if task.status in {"pending", "ready"}:
                unsatisfied = [d for d in task.depends_on if tasks.get(d) is None or tasks[d].status != "merged"]
                if unsatisfied:
                    result["waiting"].append(task.id)
                elif self.is_paused():
                    result["blocked"].append(task.id)
                else:
                    result["ready"].append(task.id)
            else:
                result["blocked"].append(task.id)
        return result

    # ------------------------------------------------------------------ tasks
    def add_task(self, payload: dict[str, Any], actor: str = "project-manager") -> Task:
        tasks = self.store.load_tasks()
        task_id = str(payload.get("id") or new_id("TASK"))
        if task_id in tasks:
            raise ValueError(f"La tarea ya existe: {task_id}")
        policy = self.policy
        task = Task.from_dict(
            {
                "id": task_id,
                "title": payload.get("title", ""),
                "story": payload.get("story", ""),
                "sprint": payload.get("sprint", ""),
                "discipline": normalize_discipline(payload.get("discipline")),
                "status": "pending",
                "priority": int(payload.get("priority", 2)),
                "depends_on": list(payload.get("depends_on", [])),
                "agent": payload.get("agent", ""),
                "tags": list(payload.get("tags", [])),
                "paths": list(payload.get("paths", [])),
                "acceptance": list(payload.get("acceptance", [])),
                "max_attempts": int(payload.get("max_attempts", policy.max_attempts)),
                "origin": payload.get("origin", "cli"),
                "next_action": "seleccionar agente y abrir rama de trabajo",
            }
        )
        if not task.title.strip():
            raise ValueError("La tarea necesita título.")
        unknown = [dep for dep in task.depends_on if dep not in tasks]
        if unknown:
            raise ValueError(f"Dependencias inexistentes: {unknown}")
        tasks[task.id] = task
        self.store.save_tasks(tasks)
        self._link_task_to_sprint(task)
        self.store.append_event("task.created", actor, task.title, task_id=task.id)
        self.store.append_run(
            {
                "at": utcnow(),
                "task_id": task.id,
                "agent": actor,
                "action": "task.created",
                "origin": task.origin,
            }
        )
        return task

    def assign(self, task_id: str) -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        if task.agent:
            return {"task": task_id, "agent": task.agent, "reason": "asignación explícita"}
        agent, reason = self.policy.route(task.tags, task.paths, task.discipline)
        task.agent = agent
        task.updated_at = utcnow()
        self.store.save_tasks(tasks)
        self.store.append_event(
            "task.assigned", "engineering-manager", f"{task.id} -> {agent}", task_id=task.id, agent=agent
        )
        return {"task": task_id, "agent": agent, "reason": reason}

    def start_task(
        self,
        task_id: str,
        *,
        agent: str | None = None,
        branch: str = "",
        origin: str = "cli",
        allow_dirty: bool = False,
    ) -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        if self.is_paused():
            raise PolicyError(f"Pausa activa ({self.pause_file}); no se inicia trabajo nuevo.")
        if task.status not in {"pending", "ready", "failed", "blocked"}:
            raise PolicyError(f"La tarea {task_id} está en {task.status}; no se puede iniciar.")
        if task.status == "blocked":
            raise PolicyError(
                f"Tarea bloqueada: {task.blocked_reason or 'sin motivo'}. "
                "Desbloquéala explícitamente antes de reanudar."
            )
        if not task.is_dependency_satisfied(tasks):
            raise PolicyError(f"Dependencias sin integrar: {task.depends_on}")
        if task.attempts >= task.max_attempts:
            raise PolicyError(
                f"Límite de {task.max_attempts} intentos alcanzado; se requiere decisión humana."
            )
        git_state = read_git_state(self.repo)
        if git_state.dirty and not allow_dirty:
            raise PolicyError(
                "El árbol de trabajo está sucio; haz commit o stash antes de iniciar una historia."
            )
        selected = agent or task.agent or self.policy.route(task.tags, task.paths, task.discipline)[0]
        if branch:
            validate_work_branch(branch)
        task.agent = selected
        task.implementer = selected
        task.branch = branch or task.branch or f"feat/{task.story or task.id}"
        task.base_commit = git_state.commit
        task.attempts += 1
        task.origin = origin
        if task.status == "pending":
            task.transition("ready", actor=selected, reason="dependencias satisfechas")
        task.transition("in_progress", actor=selected, reason="implementación iniciada")
        task.next_action = "implementar, ejecutar compuerta local y checkpoint"
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self._activate_sprint(task, actor=selected)
        self.store.append_event(
            "task.started",
            selected,
            f"intento {task.attempts}/{task.max_attempts} en {task.branch}",
            task_id=task.id,
            origin=origin,
        )
        self.store.append_run(
            {
                "at": utcnow(),
                "task_id": task.id,
                "agent": selected,
                "action": "task.started",
                "attempt": task.attempts,
                "branch": task.branch,
                "base_commit": task.base_commit,
                "origin": origin,
            }
        )
        return task.to_dict()

    def retry(self, task_id: str, *, agent: str | None = None, reason: str = "") -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        if task.status not in {"review", "failed", "blocked"}:
            raise PolicyError(f"No se reintenta una tarea en estado {task.status}.")
        if task.attempts >= task.max_attempts:
            task.transition("blocked", actor="engineering-manager", reason="límite de intentos alcanzado")
            tasks[task_id] = task
            self.store.save_tasks(tasks)
            self.store.append_event("task.blocked", "engineering-manager", task.blocked_reason, task_id=task.id)
            raise PolicyError(
                f"Límite de {task.max_attempts} intentos alcanzado; se bloquea para decisión humana."
            )
        if task.status in {"failed", "blocked"}:
            task.transition("ready", actor="engineering-manager", reason="reintento autorizado")
        task.attempts += 1
        task.agent = agent or task.agent
        task.implementer = task.agent
        task.transition("in_progress", actor=task.agent, reason=reason or "corrección")
        task.next_action = "corregir hallazgos y repetir compuerta"
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event(
            "task.retried", task.agent, f"intento {task.attempts}/{task.max_attempts}", task_id=task.id
        )
        return task.to_dict()

    def record_gate(
        self, task_id: str, gate: str, passed: bool, *, evidence: list[str] | None = None, actor: str = "ci"
    ) -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        if task.status not in {"in_progress", "review", "verified"}:
            raise PolicyError("Solo se registran compuertas sobre trabajo en curso o en revisión.")
        finding = Finding(
            kind="local_gate" if gate != "ci" else "ci",
            verdict="passed" if passed else "failed",
            reviewer=actor,
            summary=f"compuerta {gate}: {'OK' if passed else 'FALLÓ'}",
            evidence=[redact(item) for item in (evidence or [])],
        )
        task.verification.append(finding)
        task.updated_at = utcnow()
        if not passed:
            task.blocked_reason = f"compuerta {gate} falló"
            task.next_action = "corregir y repetir la compuerta"
            tasks[task_id] = task
            self.store.save_tasks(tasks)
            self.store.append_event("gate.failed", actor, finding.summary, task_id=task.id, gate=gate)
            return task.to_dict()
        required = set(self.policy.required_gates())
        passed_gates = {
            v.summary.split(":", 1)[0].split()[-1]
            for v in task.verification
            if v.kind == "local_gate" and v.verdict == "passed"
        }
        if required.issubset(passed_gates):
            task.stage = "local_gate"
            task.next_action = "solicitar QA independiente y revisión senior"
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event("gate.passed", actor, finding.summary, task_id=task.id, gate=gate)
        return task.to_dict()

    def review_plan(self, task_id: str) -> dict[str, Any]:
        """Revisores independientes sugeridos para la tarea.

        No registra veredictos: solo evita que el implementador se revise a sí
        mismo y que la disciplina quede sin revisor definido.
        """
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        excluded = {value for value in (task.agent, task.implementer) if value}
        reviewers = self.policy.reviewers_for(task.discipline, exclude=excluded)
        missing = [kind for kind, value in reviewers.items() if not value]
        return {
            "task": task.id,
            "discipline": task.discipline,
            "implementer": task.implementer or task.agent,
            "reviewers": reviewers,
            "missing": missing,
            "next_action": (
                "asignar revisores manualmente: no hay candidato independiente"
                if missing
                else "registrar veredictos con record-review"
            ),
        }

    def request_review(self, task_id: str, *, actor: str = "engineering-manager") -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        required = set(self.policy.required_gates())
        passed_gates = {
            v.summary.split(":", 1)[0].split()[-1]
            for v in task.verification
            if v.kind == "local_gate" and v.verdict == "passed"
        }
        missing = sorted(required - passed_gates)
        if missing and required:
            raise PolicyError(f"Faltan compuertas obligatorias aprobadas: {missing}")
        task.transition("review", actor=actor, reason="compuerta aprobada")
        plan = self.policy.reviewers_for(
            task.discipline, exclude={value for value in (task.agent, task.implementer) if value}
        )
        task.next_action = (
            f"QA independiente ({plan['qa'] or 'sin candidato'}) + "
            f"revisión senior ({plan['senior_review'] or 'sin candidato'})"
        )
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event("task.review", actor, task.next_action, task_id=task.id)
        return task.to_dict()

    def record_review(
        self,
        task_id: str,
        *,
        kind: str,
        verdict: str,
        reviewer: str,
        summary: str = "",
        evidence: list[str] | None = None,
    ) -> dict[str, Any]:
        if kind not in {"qa", "senior_review"}:
            raise PolicyError("kind debe ser qa o senior_review.")
        if verdict not in {"approved", "changes_requested", "blocked"}:
            raise PolicyError("verdict inválido.")
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        if task.status not in {"review", "in_progress"}:
            raise PolicyError("La tarea debe estar en review para registrar un veredicto.")
        if reviewer in {task.implementer, task.agent}:
            raise PolicyError(
                f"Revisión no independiente: {reviewer} implementó {task.id}. "
                "Se requiere otro agente."
            )
        finding = Finding(
            kind=kind,
            verdict=verdict,
            reviewer=reviewer,
            summary=summary or f"{kind}: {verdict}",
            evidence=[redact(item) for item in (evidence or [])],
        )
        task.reviews.append(finding)
        task.updated_at = utcnow()
        if verdict in {"changes_requested", "blocked"}:
            if task.status == "review":
                task.transition("in_progress", actor=reviewer, reason=f"{kind}: cambios solicitados")
            task.next_action = "corregir hallazgos de revisión"
            tasks[task_id] = task
            self.store.save_tasks(tasks)
            self.store.append_event("review.changes", reviewer, finding.summary, task_id=task.id, review_kind=kind)
            return task.to_dict()
        qa_ok = any(r.kind == "qa" and r.verdict == "approved" for r in task.reviews)
        senior_ok = any(r.kind == "senior_review" and r.verdict == "approved" for r in task.reviews)
        if task.status == "review" and qa_ok and senior_ok:
            task.transition("verified", actor=reviewer, reason="QA y revisión senior aprobadas")
            task.next_action = "esperar CI verde y preparar integración a sprint"
        else:
            task.next_action = "esperar el veredicto restante"
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event("review.approved", reviewer, finding.summary, task_id=task.id, review_kind=kind)
        return task.to_dict()

    def mark_ci_green(self, task_id: str, *, evidence: list[str] | None = None) -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        if task.status != "verified":
            raise PolicyError("Solo se registra CI verde para tareas verificadas.")
        task.verification.append(
            Finding(
                kind="ci",
                verdict="passed",
                reviewer="ci",
                summary="CI verde",
                evidence=[redact(item) for item in (evidence or [])],
            )
        )
        task.stage = "ci_green"
        task.next_action = "abrir PR de la rama de trabajo hacia sprint/*"
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event("ci.green", "ci", "CI verde", task_id=task.id)
        return task.to_dict()

    def mark_merged(self, task_id: str, *, actor: str = "release-manager") -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        task.transition("merged", actor=actor, reason="integrada en rama de sprint")
        task.next_action = "siguiente tarea del backlog"
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event("task.merged", actor, "integrada en sprint", task_id=task.id)
        return task.to_dict()

    def block(self, task_id: str, reason: str, *, actor: str = "engineering-manager") -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        task.transition("blocked", actor=actor, reason=reason)
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event("task.blocked", actor, reason, task_id=task.id)
        return task.to_dict()

    def unblock(self, task_id: str, reason: str, *, actor: str = "engineering-manager") -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        task.transition("ready", actor=actor, reason=reason)
        task.blocked_reason = ""
        task.next_action = "reanudar implementación"
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event("task.unblocked", actor, reason, task_id=task.id)
        return task.to_dict()

    def fail(self, task_id: str, reason: str, *, actor: str = "engineering-manager") -> dict[str, Any]:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        task.transition("failed", actor=actor, reason=reason)
        if not task.can_retry():
            task.next_action = "límite de intentos: requiere decisión humana"
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event("task.failed", actor, reason, task_id=task.id)
        return task.to_dict()

    # ------------------------------------------------------------- checkpoints
    def checkpoint(
        self,
        task_id: str,
        *,
        agent: str,
        stage: str = "",
        files: list[str] | None = None,
        tests: list[str] | None = None,
        failures: list[str] | None = None,
        next_action: str = "",
        client: str = "cli",
    ) -> Checkpoint:
        tasks = self.store.load_tasks()
        task = tasks[task_id]
        git_state = read_git_state(self.repo)
        hashes: dict[str, str] = {}
        for relative in files or task.files_touched:
            path = self.repo / relative
            if path.is_file():
                hashes[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
        checkpoint = Checkpoint(
            task_id=task.id,
            objective=task.title,
            agent=agent,
            branch=git_state.branch,
            base_commit=task.base_commit or git_state.commit,
            stage=stage or task.stage,
            files=hashes,
            tests=[redact(item) for item in (tests or [])],
            failures=[redact(item) for item in (failures or [])],
            attempts=task.attempts,
            depends_on=list(task.depends_on),
            next_action=next_action or task.next_action,
            client=client,
        )
        self.store.save_checkpoint(checkpoint)
        task.stage = stage or task.stage
        task.files_touched = sorted(set(task.files_touched) | set(hashes))
        task.updated_at = utcnow()
        tasks[task_id] = task
        self.store.save_tasks(tasks)
        self.store.append_event(
            "checkpoint.saved", agent, checkpoint.next_action, task_id=task.id, client=client
        )
        return checkpoint

    def recover(self, task_id: str, *, client: str = "cli") -> dict[str, Any]:
        checkpoint = self.store.load_checkpoint(task_id)
        if checkpoint is None:
            return {"state": "no_checkpoint", "task": task_id}
        tasks = self.store.load_tasks()
        task = tasks.get(task_id)
        if task is None:
            return {"state": "task_missing", "task": task_id}
        git_state = read_git_state(self.repo)
        drift: list[str] = []
        if checkpoint.branch and checkpoint.branch != git_state.branch:
            drift.append(f"rama actual {git_state.branch} != checkpoint {checkpoint.branch}")
        if checkpoint.base_commit and not is_ancestor(checkpoint.base_commit, self.repo):
            drift.append("el commit base del checkpoint no es ancestro de HEAD")
        for relative, digest in checkpoint.files.items():
            path = self.repo / relative
            if not path.is_file():
                drift.append(f"archivo ausente: {relative}")
                continue
            current = hashlib.sha256(path.read_bytes()).hexdigest()
            if current != digest:
                drift.append(f"archivo cambiado desde el checkpoint: {relative}")
        state = "resumable" if not drift else "drift"
        self.store.append_event(
            "task.recovered", client, f"estado {state}", task_id=task_id, client=client
        )
        return {
            "state": state,
            "task": task.to_dict(),
            "checkpoint": checkpoint.to_dict(),
            "drift": drift,
            "next_action": checkpoint.next_action,
        }

    # ------------------------------------------------------------------ pause
    def pause(self, reason: str = "pausa solicitada por el usuario") -> dict[str, Any]:
        self.pause_file.parent.mkdir(parents=True, exist_ok=True)
        self.pause_file.write_text(f"{utcnow()} {reason}\n", encoding="utf-8")
        self.store.append_event("team.paused", "human", reason)
        return {"paused": True, "file": str(self.pause_file)}

    def unpause(self) -> dict[str, Any]:
        if self.pause_file.exists():
            self.pause_file.unlink()
        self.store.append_event("team.resumed", "human", "archivo de pausa retirado")
        return {"paused": False}

    # ----------------------------------------------------------------- report
    def status(self) -> dict[str, Any]:
        tasks = self.store.load_tasks()
        sprints = self.store.load_sprints()
        return {
            "paused": self.is_paused(),
            "counts": summarize(tasks.values()),
            "disciplines": {
                discipline: sum(1 for task in tasks.values() if task.discipline == discipline)
                for discipline in sorted({task.discipline for task in tasks.values()})
            },
            "sprints": {sid: sprint.status for sid, sprint in sprints.items()},
            "attempts_at_limit": [t.id for t in tasks.values() if t.attempts >= t.max_attempts and t.status not in {"merged", "cancelled"}],
            "readiness": self.readiness(),
            "next": self.next_task(),
        }

    def report(self, sprint_id: str = "") -> str:
        tasks = self.store.load_tasks()
        selected = [t for t in tasks.values() if not sprint_id or t.sprint == sprint_id]
        selected.sort(key=lambda t: (t.sprint, t.id))
        lines = [f"# Reporte de ingeniería {sprint_id or '(global)'}", "", f"Generado: {utcnow()}", ""]
        lines.append(f"- Pausa activa: {'sí' if self.is_paused() else 'no'}")
        lines.append(f"- Tareas registradas: {len(selected)}")
        counts = summarize(selected)
        if counts:
            lines.append("")
            lines.append("## Estado")
            lines.append("")
            for status in sorted(counts):
                lines.append(f"- `{status}`: {counts[status]}")
        lines.append("")
        lines.append("## Detalle")
        for task in selected:
            lines.append("")
            lines.append(f"### {task.id} — {task.title}")
            lines.append("")
            lines.append(f"- Estado: `{task.status}` (etapa `{task.stage}`)")
            lines.append(f"- Disciplina: `{task.discipline}`")
            lines.append(f"- Agente: `{task.agent or 'sin asignar'}`")
            lines.append(f"- Intentos: {task.attempts}/{task.max_attempts}")
            lines.append(f"- Rama: `{task.branch or '—'}`")
            lines.append(f"- Dependencias: {', '.join(task.depends_on) or 'ninguna'}")
            if task.blocked_reason:
                lines.append(f"- Bloqueo: {redact(task.blocked_reason)}")
            if task.next_action:
                lines.append(f"- Próxima acción: {redact(task.next_action)}")
            for gate in task.verification:
                lines.append(f"  - {gate.kind}: {gate.verdict} ({gate.reviewer})")
            for review in task.reviews:
                lines.append(f"  - {review.kind}: {review.verdict} ({review.reviewer})")
        lines.append("")
        return "\n".join(lines)

    def _link_task_to_sprint(self, task: Task) -> None:
        """Registra la tarea en su sprint cuando el sprint existe."""
        if not task.sprint:
            return
        sprints = self.store.load_sprints()
        sprint = sprints.get(task.sprint)
        if sprint is None or task.id in sprint.tasks:
            return
        sprint.tasks.append(task.id)
        self.store.save_sprints(sprints)

    def _activate_sprint(self, task: Task, *, actor: str) -> None:
        """El primer inicio de trabajo deja el sprint en `active`."""
        if not task.sprint:
            return
        sprints = self.store.load_sprints()
        sprint = sprints.get(task.sprint)
        if sprint is None or sprint.status != "planned":
            return
        sprint.status = "active"
        self.store.save_sprints(sprints)
        self.store.append_event(
            "sprint.activated", actor, f"sprint {sprint.id} en curso", sprint=sprint.id
        )

    def add_sprint(self, sprint_id: str, goal: str, branch: str = "") -> Sprint:
        sprints = self.store.load_sprints()
        if sprint_id in sprints:
            raise ValueError(f"El sprint ya existe: {sprint_id}")
        if branch:
            from .gitguard import validate_sprint_branch

            validate_sprint_branch(branch)
        sprint = Sprint(id=sprint_id, goal=goal, branch=branch or f"sprint/{sprint_id}")
        sprints[sprint_id] = sprint
        self.store.save_sprints(sprints)
        self.store.append_event("sprint.created", "project-manager", goal, sprint=sprint_id)
        return sprint

    def close_sprint(self, sprint_id: str, *, actor: str = "project-manager") -> dict[str, Any]:
        """Cierra un sprint solo si todas sus tareas están integradas o canceladas."""
        sprints = self.store.load_sprints()
        sprint = sprints.get(sprint_id)
        if sprint is None:
            raise ValueError(f"El sprint no existe: {sprint_id}")
        if sprint.status == "closed":
            raise PolicyError(f"El sprint {sprint_id} ya está cerrado.")
        tasks = self.store.load_tasks()
        related: dict[str, Task] = {tid: tasks[tid] for tid in sprint.tasks if tid in tasks}
        for task in tasks.values():
            if task.sprint == sprint_id:
                related[task.id] = task
        if not related:
            raise PolicyError(f"El sprint {sprint_id} no tiene tareas registradas.")
        pending = sorted(task_id for task_id, task in related.items() if task.status not in {"merged", "cancelled"})
        if pending:
            raise PolicyError(f"No se cierra un sprint con tareas sin integrar: {pending}")
        sprint.status = "closed"
        sprint.closed_at = utcnow()
        sprints[sprint_id] = sprint
        self.store.save_sprints(sprints)
        self.store.append_event(
            "sprint.closed", actor, f"sprint {sprint_id} cerrado", sprint=sprint_id
        )
        return sprint.to_dict()


def run_command(command: str, cwd: Path | str = ".", timeout: int = 1800) -> dict[str, Any]:
    """Ejecuta una compuerta real y devuelve evidencia acotada."""
    result = subprocess.run(
        command,
        shell=True,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    output = (result.stdout or "") + (result.stderr or "")
    tail = redact(output[-2000:])
    return {"command": command, "passed": result.returncode == 0, "returncode": result.returncode, "tail": tail}
