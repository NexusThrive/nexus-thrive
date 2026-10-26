"""Pruebas de idempotencia de los webhooks de automatización."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import support

from nexus_engineering.workflows import WorkflowLedger


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = support.make_store(Path(self.tmp.name))
        self.store.initialize()
        self.ledger = WorkflowLedger(store=self.store)

    def tearDown(self):
        self.tmp.cleanup()

    def test_evento_repetido_no_duplica(self):
        first = self.ledger.register("A", "task.request", "evt-abcdefgh", "solicitud")
        second = self.ledger.register("A", "task.request", "evt-abcdefgh", "solicitud")
        self.assertEqual(first["state"], "accepted")
        self.assertEqual(second["state"], "duplicate")
        self.assertEqual(first["execution"]["id"], second["execution"]["id"])
        self.assertEqual(len(self.ledger.history()), 1)

    def test_workflow_desconocido_rechazado(self):
        with self.assertRaises(ValueError):
            self.ledger.register("Z", "task.request", "evt-abcdefgh")

    def test_webhook_valida_contrato(self):
        result = self.ledger.from_webhook(
            "A", {"event": "task.request", "idempotency_key": "evt-12345678", "title": "HU"}
        )
        self.assertEqual(result["state"], "accepted")

    def test_historial_persiste(self):
        self.ledger.register("B", "knowledge.update", "evt-knowledge1")
        self.assertEqual(len(WorkflowLedger(store=self.store).history()), 1)


if __name__ == "__main__":
    unittest.main()
