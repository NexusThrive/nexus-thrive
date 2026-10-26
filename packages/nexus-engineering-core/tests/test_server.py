"""Pruebas del puente HTTP: autenticación, validación e idempotencia real."""
from __future__ import annotations

import json
import tempfile
import unittest
import urllib.error
import urllib.request
from pathlib import Path

import support

from nexus_engineering.orchestrator import Orchestrator
from nexus_engineering.server import create_server, serve_in_thread
from nexus_engineering.workflows import WorkflowLedger

TOKEN = "token-de-prueba-1234567890"


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.repo = support.make_repo(self.root)
        self.store = support.make_store(self.root)
        self.orch = Orchestrator(store=self.store, policy=support.make_policy(self.root), repo=self.repo)
        self.orch.bootstrap()
        self.ledger = WorkflowLedger(store=self.store)
        self.server = create_server(self.orch, self.ledger, TOKEN, port=0)
        self.stop = serve_in_thread(self.server)
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"

    def tearDown(self):
        self.stop()
        self.tmp.cleanup()

    def post(self, path: str, payload: dict, token: str | None = TOKEN) -> tuple[int, dict]:
        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(self.base + path, data=data, method="POST")
        request.add_header("Content-Type", "application/json")
        if token:
            request.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def test_sin_token_rechaza(self):
        status, body = self.post(
            "/webhooks/n8n/A",
            {"event": "task.request", "idempotency_key": "evt-12345678", "title": "x"},
            token=None,
        )
        self.assertEqual(status, 401)
        self.assertIn("error", body)

    def test_token_incorrecto_rechaza(self):
        status, _ = self.post(
            "/webhooks/n8n/A",
            {"event": "task.request", "idempotency_key": "evt-12345678", "title": "x"},
            token="otro-token-distinto-123",
        )
        self.assertEqual(status, 401)

    def test_evento_duplicado_no_crea_dos_tareas(self):
        payload = {
            "event": "task.request",
            "idempotency_key": "evt-abcdefgh",
            "title": "Nueva historia",
            "task": {"id": "HU-N8N-01", "title": "Nueva historia", "tags": ["backend"]},
        }
        first, _ = self.post("/webhooks/n8n/A", payload)
        second, body = self.post("/webhooks/n8n/A", payload)
        self.assertEqual(first, 202)
        self.assertEqual(second, 200)
        self.assertEqual(body["state"], "duplicate")
        self.assertEqual(len(self.orch.store.load_tasks()), 1)
        self.assertEqual(len(self.ledger.history()), 1)

    def test_evento_invalido_rechazado(self):
        status, body = self.post(
            "/webhooks/n8n/A",
            {"event": "rm -rf", "idempotency_key": "evt-12345678", "title": "x"},
        )
        self.assertEqual(status, 400)
        self.assertIn("no autorizado", body["error"])

    def test_health_publico_y_status_privado(self):
        with urllib.request.urlopen(self.base + "/health", timeout=10) as response:
            self.assertEqual(response.status, 200)
        try:
            urllib.request.urlopen(self.base + "/status", timeout=10)
            self.fail("status debería exigir token")
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 401)

    def test_servidor_exige_token_configurado(self):
        with self.assertRaises(RuntimeError):
            create_server(self.orch, self.ledger, "", port=0)
        with self.assertRaises(RuntimeError):
            create_server(self.orch, self.ledger, "corto", port=0)


if __name__ == "__main__":
    unittest.main()
