"""Registro idempotente de ejecuciones de n8n y otros automatizadores."""
from __future__ import annotations

from typing import Any

from .domain import WorkflowExecution, new_id, utcnow
from .security import redact, validate_webhook_payload
from .store import StateStore

ALLOWED_WORKFLOWS = {
    "A": "nueva-solicitud",
    "B": "actualizacion-conocimiento",
    "C": "ejecucion-sprint",
    "D": "recuperacion",
    "E": "ci-revision",
    "F": "informes",
    "G": "notificaciones",
    "H": "investigacion-periodica",
    "I": "preparacion-brief",
    "J": "aprobacion-campana",
    "K": "actualizacion-metricas",
}


class WorkflowLedger:
    def __init__(self, store: StateStore | None = None) -> None:
        self.store = store or StateStore()

    def _load(self) -> list[dict[str, Any]]:
        return self.store.read_json(self.store.workflows_file, {"executions": []}).get("executions", [])

    def register(self, workflow: str, event: str, idempotency_key: str, detail: str = "") -> dict[str, Any]:
        if workflow not in ALLOWED_WORKFLOWS:
            raise ValueError(f"Workflow desconocido: {workflow}")
        executions = self._load()
        for item in executions:
            if item.get("idempotency_key") == idempotency_key:
                return {"state": "duplicate", "execution": item}
        execution = WorkflowExecution(
            id=new_id("WF"),
            workflow=workflow,
            event=event,
            idempotency_key=idempotency_key,
            status="accepted",
            detail=redact(detail)[:500],
            received_at=utcnow(),
        )
        executions.append(execution.to_dict())
        executions = executions[-2000:]
        self.store._write_json(self.store.workflows_file, {"executions": executions, "updated_at": utcnow()})
        self.store.append_event(
            "workflow.received", f"n8n:{ALLOWED_WORKFLOWS[workflow]}", event, execution=execution.id
        )
        return {"state": "accepted", "execution": execution.to_dict()}

    def from_webhook(self, workflow: str, payload: dict[str, Any]) -> dict[str, Any]:
        clean = validate_webhook_payload(payload)
        return self.register(workflow, clean["event"], clean["idempotency_key"], clean["title"])

    def history(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._load()[-limit:]
