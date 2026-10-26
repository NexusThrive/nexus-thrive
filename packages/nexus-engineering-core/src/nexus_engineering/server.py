"""Puente HTTP autenticado para n8n y otros automatizadores.

No expone administración sin token: si no hay `NEXUS_WEBHOOK_TOKEN` el servidor
se niega a arrancar. Los cuerpos se validan y nunca se registran en claro.
"""
from __future__ import annotations

import hmac
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable
from urllib.parse import urlparse

from .knowledge import KnowledgeHub
from .orchestrator import Orchestrator
from .security import redact, validate_webhook_payload
from .workflows import ALLOWED_WORKFLOWS, WorkflowLedger

MAX_BODY = 64 * 1024


def _authorized(header: str | None, token: str) -> bool:
    if not header or not header.startswith("Bearer "):
        return False
    candidate = header[len("Bearer ") :].strip()
    return hmac.compare_digest(candidate, token)


class NexusHandler(BaseHTTPRequestHandler):
    server_version = "NexusEngineering/1.0"
    orch: Orchestrator
    ledger: WorkflowLedger
    token: str

    # ------------------------------------------------------------- utilities
    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        # Solo método y ruta; nunca cabeceras ni cuerpo.
        print(f"[nexus-eng] {self.command} {urlparse(self.path).path}")

    def _send(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _require_auth(self) -> bool:
        if _authorized(self.headers.get("Authorization"), self.token):
            return True
        self._send(401, {"error": "no autorizado"})
        return False

    def _read_json(self) -> dict[str, Any] | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send(400, {"error": "Content-Length inválido"})
            return None
        if length <= 0 or length > MAX_BODY:
            self._send(413 if length > MAX_BODY else 400, {"error": "cuerpo inválido o demasiado grande"})
            return None
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            self._send(400, {"error": "JSON inválido"})
            return None
        if not isinstance(payload, dict):
            self._send(400, {"error": "se esperaba un objeto JSON"})
            return None
        return payload

    # ----------------------------------------------------------------- routes
    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/health":
            self._send(200, {"ok": True, "service": "nexus-engineering"})
            return
        if not self._require_auth():
            return
        if path == "/status":
            self._send(200, self.orch.status())
            return
        if path == "/next":
            result = self.orch.next_task()
            self._send(200 if result["state"] == "ready" else 200, result)
            return
        if path == "/knowledge":
            hub = KnowledgeHub(store=self.orch.store, repo=self.orch.repo)
            self._send(200, {"sources": hub.list_sources()})
            return
        self._send(404, {"error": "ruta no encontrada"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if not path.startswith("/webhooks/n8n/"):
            self._send(404, {"error": "ruta no encontrada"})
            return
        if not self._require_auth():
            return
        workflow = path.rsplit("/", 1)[-1].upper()
        if workflow not in ALLOWED_WORKFLOWS:
            self._send(404, {"error": "workflow desconocido"})
            return
        payload = self._read_json()
        if payload is None:
            return
        try:
            clean = validate_webhook_payload(payload)
            # Bloqueo del estado: la comprobación de idempotencia y el registro
            # forman una sola operación atómica frente a webhooks concurrentes.
            with self.orch.store.lock():
                duplicate = any(
                    item.get("idempotency_key") == clean["idempotency_key"]
                    for item in self.ledger.history(2000)
                )
                if not duplicate and workflow == "A" and isinstance(payload.get("task"), dict):
                    task_payload = dict(payload["task"])
                    task_payload.setdefault("origin", "n8n")
                    task_payload.setdefault("title", clean["title"])
                    self.orch.add_task(task_payload, actor="n8n")
                result = self.ledger.from_webhook(workflow, payload)
        except (ValueError, KeyError) as exc:
            self._send(400, {"error": redact(str(exc))})
            return
        except Exception as exc:  # noqa: BLE001 - el servidor no debe caerse
            self._send(500, {"error": redact(f"error interno: {exc}")})
            return
        status = 200 if result["state"] == "duplicate" else 202
        self._send(status, result)


def create_server(
    orch: Orchestrator,
    ledger: WorkflowLedger,
    token: str,
    host: str = "127.0.0.1",
    port: int = 8787,
) -> ThreadingHTTPServer:
    if not token or len(token) < 16:
        raise RuntimeError(
            "NEXUS_WEBHOOK_TOKEN ausente o demasiado corto (mínimo 16 caracteres). "
            "El puente no arranca sin autenticación."
        )
    handler = type(
        "BoundNexusHandler",
        (NexusHandler,),
        {"orch": orch, "ledger": ledger, "token": token},
    )
    server = ThreadingHTTPServer((host, port), handler)
    server.daemon_threads = True
    return server


def serve_in_thread(server: ThreadingHTTPServer) -> Callable[[], None]:
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def stop() -> None:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    return stop
