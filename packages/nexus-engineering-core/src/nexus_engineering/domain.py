"""Modelo de dominio y máquina de estados del equipo de ingeniería.

Todos los clientes (OpenCode, Claude Code, n8n, CLI) comparten estos tipos.
No se guardan secretos ni transcripciones completas en el estado.
"""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable


SCHEMA_VERSION = 1
MAX_ATTEMPTS = 3

# Estados explícitos. ``merged`` y ``cancelled`` son terminales.
STATUSES = (
    "pending",
    "ready",
    "in_progress",
    "blocked",
    "failed",
    "review",
    "verified",
    "merged",
    "cancelled",
)

TERMINAL = frozenset({"merged", "cancelled"})

# Disciplinas que comparten el mismo motor, los mismos límites de autonomía y
# las mismas compuertas de revisión. Cambia el ciclo de trabajo, no la política.
DISCIPLINES = ("engineering", "design", "documentation", "marketing", "growth", "research")

# Etapas orientativas de cada ciclo. No son estados: el estado sigue siendo el
# de TRANSITIONS. Sirven para que el orquestador explique en qué punto está la
# tarea y qué evidencia falta.
LOOP_STAGES: dict[str, tuple[str, ...]] = {
    "engineering": (
        "planificar",
        "investigar",
        "implementar",
        "probar",
        "revisar",
        "integrar",
        "documentar",
    ),
    "design": (
        "auditar",
        "definir-problema",
        "disenar",
        "implementar",
        "comparar",
        "accesibilidad",
        "qa-visual",
        "aprobar",
    ),
    "documentation": (
        "investigar",
        "redactar",
        "verificar-procedencia",
        "revisar",
        "publicar",
    ),
    "marketing": (
        "investigar",
        "hipotesis",
        "brief",
        "crear",
        "verificar",
        "aprobar",
        "publicar-autorizado",
        "medir",
    ),
    "growth": (
        "hipotesis",
        "instrumentar",
        "ejecutar",
        "medir",
        "decidir",
    ),
    "research": (
        "definir-pregunta",
        "recopilar-fuentes",
        "evaluar",
        "sintetizar",
        "registrar-procedencia",
    ),
}


def normalize_discipline(value: str | None) -> str:
    """Devuelve una disciplina válida o lanza un error explícito."""
    discipline = (value or "engineering").strip().lower()
    if discipline not in DISCIPLINES:
        raise PolicyError(
            f"Disciplina desconocida: {value!r}. Válidas: {', '.join(DISCIPLINES)}"
        )
    return discipline


def loop_stages(discipline: str) -> tuple[str, ...]:
    return LOOP_STAGES[normalize_discipline(discipline)]

# Transiciones permitidas. No existe ningún camino directo de in_progress a
# merged: la tarea debe pasar por review y verified con evidencias.
TRANSITIONS: dict[str, frozenset[str]] = {
    "pending": frozenset({"ready", "cancelled"}),
    "ready": frozenset({"in_progress", "blocked", "cancelled"}),
    "in_progress": frozenset({"review", "blocked", "failed", "cancelled"}),
    "review": frozenset({"verified", "in_progress", "blocked", "failed", "cancelled"}),
    "verified": frozenset({"merged", "in_progress", "cancelled"}),
    "blocked": frozenset({"ready", "cancelled"}),
    "failed": frozenset({"ready", "blocked", "cancelled"}),
    "merged": frozenset(),
    "cancelled": frozenset(),
}


class TransitionError(ValueError):
    """Transición de estado no permitida por la política."""


class PolicyError(ValueError):
    """Operación rechazada por una regla de autonomía/seguridad."""


def utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


@dataclass
class Finding:
    """Hallazgo de verificación o revisión (sin secretos)."""

    kind: str  # local_gate | qa | senior_review | ci | security
    verdict: str  # passed | failed | approved | changes_requested | blocked
    reviewer: str
    summary: str
    evidence: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=utcnow)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Task:
    id: str
    title: str
    story: str = ""
    sprint: str = ""
    discipline: str = "engineering"  # engineering | design | documentation | marketing | growth | research
    status: str = "pending"
    priority: int = 2  # 0 = más alta
    depends_on: list[str] = field(default_factory=list)
    agent: str = ""
    implementer: str = ""
    attempts: int = 0
    max_attempts: int = MAX_ATTEMPTS
    tags: list[str] = field(default_factory=list)
    paths: list[str] = field(default_factory=list)
    acceptance: list[str] = field(default_factory=list)
    branch: str = ""
    base_commit: str = ""
    files_touched: list[str] = field(default_factory=list)
    stage: str = "pending"  # última etapa completada
    verification: list[Finding] = field(default_factory=list)
    reviews: list[Finding] = field(default_factory=list)
    next_action: str = ""
    blocked_reason: str = ""
    origin: str = "opencode"  # opencode | claude-code | n8n | cli
    created_at: str = field(default_factory=utcnow)
    updated_at: str = field(default_factory=utcnow)

    # ------------------------------------------------------------------ util
    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Task":
        payload = dict(data)
        payload["verification"] = [
            Finding(**f) if isinstance(f, dict) else f for f in payload.get("verification", [])
        ]
        payload["reviews"] = [
            Finding(**f) if isinstance(f, dict) else f for f in payload.get("reviews", [])
        ]
        known = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in payload.items() if k in known})

    def is_dependency_satisfied(self, tasks: dict[str, "Task"]) -> bool:
        for dep_id in self.depends_on:
            dep = tasks.get(dep_id)
            if dep is None or dep.status != "merged":
                return False
        return True

    def can_retry(self) -> bool:
        return self.attempts < self.max_attempts

    def loop(self) -> dict[str, Any]:
        """Ciclo aplicable a la disciplina de la tarea."""
        discipline = normalize_discipline(self.discipline)
        return {"discipline": discipline, "stages": list(LOOP_STAGES[discipline])}

    # --------------------------------------------------------- state machine
    def transition(self, target: str, *, actor: str, reason: str = "") -> None:
        if target not in STATUSES:
            raise TransitionError(f"Estado desconocido: {target}")
        if target == self.status:
            return
        allowed = TRANSITIONS[self.status]
        if target not in allowed:
            raise TransitionError(
                f"Transición no permitida: {self.status} -> {target} (tarea {self.id})"
            )
        if target == "review":
            self._require_gate()
        if target == "verified":
            self._require_independent_review()
            self._require_qa()
        if target == "merged":
            if self.stage != "ci_green":
                raise PolicyError(
                    "No se integra una tarea sin CI verde registrado (stage=ci_green)."
                )
        self.status = target
        self.updated_at = utcnow()
        self.stage = target
        if target in {"blocked", "failed"}:
            self.blocked_reason = reason
        elif target in {"ready", "in_progress"}:
            self.blocked_reason = ""
        self.next_action = reason if target in {"blocked", "failed"} else self.next_action

    def _require_gate(self) -> None:
        gate = [v for v in self.verification if v.kind == "local_gate" and v.verdict == "passed"]
        if not gate:
            raise PolicyError(
                "La compuerta local no está aprobada: no se puede pasar a review."
            )

    def _require_qa(self) -> None:
        if not any(r.kind == "qa" and r.verdict == "approved" for r in self.reviews):
            raise PolicyError("Falta QA independiente aprobado: no se puede pasar a verified.")

    def _require_independent_review(self) -> None:
        reviews = [r for r in self.reviews if r.kind in {"qa", "senior_review"}]
        if not reviews:
            raise PolicyError("Falta revisión independiente: no se puede pasar a verified.")
        implementers = {self.implementer, self.agent}
        for review in reviews:
            if review.reviewer in implementers:
                raise PolicyError(
                    f"Revisión no independiente: {review.reviewer} implementó la tarea."
                )
        if not any(r.kind == "senior_review" and r.verdict == "approved" for r in self.reviews):
            raise PolicyError("Falta revisión senior aprobada.")


@dataclass
class Sprint:
    id: str
    goal: str
    status: str = "planned"  # planned | active | paused | closed
    branch: str = ""
    base_commit: str = ""
    tasks: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=utcnow)
    closed_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Checkpoint:
    task_id: str
    objective: str
    agent: str
    branch: str
    base_commit: str
    stage: str
    files: dict[str, str]  # ruta -> sha256 del contenido en el momento del checkpoint
    tests: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)
    attempts: int = 0
    depends_on: list[str] = field(default_factory=list)
    next_action: str = ""
    client: str = ""
    updated_at: str = field(default_factory=utcnow)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Checkpoint":
        known = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in data.items() if k in known})


@dataclass
class KnowledgeSource:
    id: str
    title: str
    kind: str  # official_docs | project_docs | code | incident | research | internal
    location: str = ""
    url: str = ""
    provenance: str = ""
    added_at: str = field(default_factory=utcnow)
    last_verified: str = ""
    status: str = "active"  # active | stale | unavailable | rejected
    project: str = "nexus"
    module: str = ""
    tags: list[str] = field(default_factory=list)
    confidence: str = "medium"  # high | medium | low
    origin_refs: list[str] = field(default_factory=list)
    sync_targets: list[str] = field(default_factory=list)
    content_hash: str = ""
    trust: str = "untrusted"  # todo contenido externo es dato, no instrucción
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "KnowledgeSource":
        known = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in data.items() if k in known})


@dataclass
class SyncRun:
    id: str
    source_id: str
    adapter: str
    status: str  # ok | skipped | unavailable | error
    detail: str = ""
    started_at: str = field(default_factory=utcnow)
    finished_at: str = ""
    content_hash: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class WorkflowExecution:
    id: str
    workflow: str
    event: str
    idempotency_key: str
    status: str = "accepted"  # accepted | duplicate | error
    detail: str = ""
    received_at: str = field(default_factory=utcnow)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def validate_transition_graph() -> None:
    """Comprobación de cordura del grafo de estados (usada por tests/health)."""
    for status, targets in TRANSITIONS.items():
        if status not in STATUSES:
            raise AssertionError(f"Estado origen inválido: {status}")
        for target in targets:
            if target not in STATUSES:
                raise AssertionError(f"Estado destino inválido: {target}")
    if "merged" in TRANSITIONS["in_progress"]:
        raise AssertionError("in_progress no puede ir directo a merged")


def summarize(tasks: Iterable[Task]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        counts[task.status] = counts.get(task.status, 0) + 1
    return counts
