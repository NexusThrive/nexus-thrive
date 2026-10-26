"""Pruebas de extremo a extremo de la CLI (proceso real, estado temporal)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import support

CORE = support.CORE


class CliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.repo = support.make_repo(self.root)
        self.state = self.root / "state"
        self.env = {
            **os.environ,
            "PYTHONPATH": str(CORE / "src"),
            "NEXUS_STATE_DIR": str(self.state),
        }

    def tearDown(self):
        self.tmp.cleanup()

    def cli(self, *args: str, expect: int = 0) -> dict:
        result = subprocess.run(
            [sys.executable, "-m", "nexus_engineering", "--repo", str(self.repo), "--json", *args],
            capture_output=True,
            text=True,
            env=self.env,
            timeout=60,
        )
        if result.returncode != expect:
            self.fail(
                f"exit {result.returncode} != {expect}\nstdout={result.stdout}\nstderr={result.stderr}"
            )
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return {"stderr": result.stderr}

    def test_flujo_de_historia_por_cli(self):
        self.cli("init")
        task = self.cli("add-task", "--id", "TASK-1", "--title", "Endpoints", "--tags", "backend")
        self.assertEqual(task["status"], "pending")
        assigned = self.cli("assign", "TASK-1")
        self.assertEqual(assigned["agent"], "backend-engineer")
        started = self.cli("start", "TASK-1", "--branch", "feat/HU-1", "--origin", "opencode")
        self.assertEqual(started["status"], "in_progress")
        self.assertEqual(started["attempts"], 1)

        for gate in ("lint", "typecheck", "test"):
            self.cli("gate", "TASK-1", "--gate", gate, "--passed")
        reviewed = self.cli("request-review", "TASK-1")
        self.assertEqual(reviewed["status"], "review")

        self.cli("review", "TASK-1", "--kind", "qa", "--verdict", "approved", "--reviewer", "qa-engineer")
        # La revisión del propio implementador debe fallar.
        self.cli(
            "review",
            "TASK-1",
            "--kind",
            "senior_review",
            "--verdict",
            "approved",
            "--reviewer",
            "backend-engineer",
            expect=1,
        )
        self.cli(
            "review",
            "TASK-1",
            "--kind",
            "senior_review",
            "--verdict",
            "approved",
            "--reviewer",
            "senior-reviewer",
        )
        self.cli("ci-green", "TASK-1", "--evidence", "https://ci/1")
        merged = self.cli("merge", "TASK-1")
        self.assertEqual(merged["status"], "merged")

        status = self.cli("status")
        self.assertEqual(status["counts"]["merged"], 1)

    def test_sprint_activo_y_cierre_por_cli(self):
        self.cli("init")
        self.cli("sprint-add", "S01", "--goal", "objetivo del sprint")
        self.cli(
            "add-task", "--id", "TASK-S", "--title", "Sprint", "--sprint", "S01",
            "--agent", "backend-engineer",
        )
        self.cli("start", "TASK-S", "--branch", "feat/HU-1")
        self.assertEqual(self.cli("status")["sprints"]["S01"], "active")
        for gate in ("lint", "typecheck", "test"):
            self.cli("gate", "TASK-S", "--gate", gate, "--passed")
        self.cli("request-review", "TASK-S")
        self.cli("review", "TASK-S", "--kind", "qa", "--verdict", "approved", "--reviewer", "qa-engineer")
        self.cli(
            "review", "TASK-S", "--kind", "senior_review", "--verdict", "approved",
            "--reviewer", "senior-reviewer",
        )
        self.cli("ci-green", "TASK-S", "--evidence", "https://ci/run/1")
        self.cli("merge", "TASK-S")
        closed = self.cli("sprint-close", "S01")
        self.assertEqual(closed["status"], "closed")
        self.assertTrue(closed["closed_at"])

    def test_pausa_y_next(self):
        self.cli("init")
        self.cli("add-task", "--id", "TASK-1", "--title", "Algo")
        self.assertEqual(self.cli("next")["state"], "ready")
        self.cli("pause", "--reason", "prueba")
        self.assertEqual(self.cli("next", expect=1)["state"], "paused")
        self.cli("unpause")

    def test_recuperacion_por_cli(self):
        self.cli("init")
        self.cli("add-task", "--id", "TASK-1", "--title", "Algo", "--agent", "backend-engineer")
        self.cli("start", "TASK-1", "--branch", "feat/HU-1")
        self.cli(
            "checkpoint", "TASK-1", "--agent", "backend-engineer", "--files", "lib/a.ts", "--client", "opencode"
        )
        result = self.cli("recover", "TASK-1", "--client", "claude-code")
        self.assertEqual(result["state"], "resumable")

    def test_knowledge_add_list_search(self):
        self.cli("init")
        added = self.cli(
            "knowledge",
            "add",
            "--title",
            "Prisma 8",
            "--kind",
            "official_docs",
            "--url",
            "https://prisma.io/docs",
            "--provenance",
            "docs oficiales",
            "--tags",
            "prisma",
            "orm",
        )
        self.assertEqual(added["state"], "created")
        listed = self.cli("knowledge", "list")
        self.assertEqual(len(listed), 1)
        found = self.cli("knowledge", "search", "prisma")
        self.assertEqual(len(found), 1)

    def test_workflow_idempotente_por_cli(self):
        self.cli("init")
        first = self.cli(
            "workflow-event",
            "--workflow",
            "A",
            "--event",
            "task.request",
            "--idempotency-key",
            "evt-abcdefgh",
        )
        second = self.cli(
            "workflow-event",
            "--workflow",
            "A",
            "--event",
            "task.request",
            "--idempotency-key",
            "evt-abcdefgh",
        )
        self.assertEqual(first["state"], "accepted")
        self.assertEqual(second["state"], "duplicate")


if __name__ == "__main__":
    unittest.main()
