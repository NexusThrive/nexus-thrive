"""Pruebas del orquestador: cola, dependencias, intentos, pausa y recuperación."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import support

from nexus_engineering.domain import PolicyError
from nexus_engineering.orchestrator import Orchestrator


class OrchestratorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.repo = support.make_repo(self.root)
        self.orch = Orchestrator(
            store=support.make_store(self.root),
            policy=support.make_policy(self.root),
            repo=self.repo,
        )
        self.orch.bootstrap()

    def tearDown(self):
        self.tmp.cleanup()

    def add(self, task_id: str, **kwargs):
        payload = {"id": task_id, "title": f"Tarea {task_id}"}
        payload.update(kwargs)
        return self.orch.add_task(payload)

    def test_dependencias_bloquean_y_desbloquean(self):
        self.add("TASK-A")
        self.add("TASK-B", depends_on=["TASK-A"], priority=0)
        ready = self.orch.readiness()
        self.assertIn("TASK-A", ready["ready"])
        self.assertIn("TASK-B", ready["waiting"])
        self.assertEqual(self.orch.next_task()["task"]["id"], "TASK-A")

        tasks = self.orch.store.load_tasks()
        tasks["TASK-A"].status = "merged"
        self.orch.store.save_tasks(tasks)
        self.assertEqual(self.orch.next_task()["task"]["id"], "TASK-B")

    def test_no_inicia_con_arbol_sucio(self):
        task = self.add("TASK-A")
        (self.repo / "lib" / "a.ts").write_text("export const a = 2;\n", encoding="utf-8")
        with self.assertRaises(PolicyError):
            self.orch.start_task(task.id, branch="feat/HU-1")

    def test_rama_protegida_rechazada(self):
        task = self.add("TASK-A")
        with self.assertRaises(Exception):
            self.orch.start_task(task.id, branch="main")

    def test_limite_de_tres_intentos(self):
        task = self.add("TASK-A", agent="backend-engineer")
        self.orch.start_task(task.id, origin="opencode")
        self.orch.fail(task.id, "fallo 1")
        self.orch.retry(task.id, reason="corrección 1")
        self.orch.fail(task.id, "fallo 2")
        self.orch.retry(task.id, reason="corrección 2")
        self.orch.fail(task.id, "fallo 3")
        with self.assertRaises(PolicyError):
            self.orch.retry(task.id, reason="corrección 3")
        stored = self.orch.store.load_tasks()[task.id]
        self.assertEqual(stored.status, "blocked")
        self.assertEqual(stored.attempts, 3)
        with self.assertRaises(PolicyError):
            self.orch.start_task(task.id)

    def test_pausa_detiene_siguiente_tarea(self):
        self.add("TASK-A")
        self.orch.pause("prueba")
        self.assertTrue(self.orch.is_paused())
        self.assertEqual(self.orch.next_task()["state"], "paused")
        with self.assertRaises(PolicyError):
            self.orch.start_task("TASK-A")
        self.orch.unpause()
        self.assertEqual(self.orch.next_task()["state"], "ready")

    def test_checkpoint_y_recuperacion_sin_deriva(self):
        task = self.add("TASK-A", agent="backend-engineer")
        self.orch.start_task(task.id, branch="feat/HU-1")
        checkpoint = self.orch.checkpoint(
            task.id, agent="backend-engineer", files=["lib/a.ts"], tests=["unit"], next_action="seguir"
        )
        self.assertTrue(checkpoint.files["lib/a.ts"])
        result = self.orch.recover(task.id)
        self.assertEqual(result["state"], "resumable", result["drift"])
        self.assertEqual(result["next_action"], "seguir")

    def test_recuperacion_detecta_deriva(self):
        task = self.add("TASK-A", agent="backend-engineer")
        self.orch.start_task(task.id, branch="feat/HU-1")
        self.orch.checkpoint(task.id, agent="backend-engineer", files=["lib/a.ts"])
        (self.repo / "lib" / "a.ts").write_text("export const a = 99;\n", encoding="utf-8")
        result = self.orch.recover(task.id)
        self.assertEqual(result["state"], "drift")
        self.assertTrue(any("lib/a.ts" in item for item in result["drift"]))

    def test_routing_elije_agente_por_etiqueta_y_ruta(self):
        task = self.add("TASK-UI", tags=["ui"])
        assigned = self.orch.assign(task.id)
        self.assertEqual(assigned["agent"], "frontend-engineer")
        db_task = self.add("TASK-DB", paths=["prisma/schema.prisma"])
        self.assertEqual(self.orch.assign(db_task.id)["agent"], "database-engineer")

    def test_qa_y_revision_independientes_habilitan_verified(self):
        task = self.add("TASK-A", agent="backend-engineer")
        self.orch.start_task(task.id, branch="feat/HU-1")
        for gate in ("lint", "typecheck", "test"):
            self.orch.record_gate(task.id, gate, True, evidence=["ok"], actor="local-gate")
        self.orch.request_review(task.id)
        with self.assertRaises(PolicyError):
            self.orch.record_review(
                task.id, kind="qa", verdict="approved", reviewer="backend-engineer"
            )
        self.orch.record_review(task.id, kind="qa", verdict="approved", reviewer="qa-engineer")
        self.assertEqual(self.orch.store.load_tasks()[task.id].status, "review")
        self.orch.record_review(
            task.id, kind="senior_review", verdict="approved", reviewer="senior-reviewer"
        )
        self.assertEqual(self.orch.store.load_tasks()[task.id].status, "verified")
        self.orch.mark_ci_green(task.id, evidence=["https://ci/run/1"])
        self.orch.mark_merged(task.id)
        self.assertEqual(self.orch.store.load_tasks()[task.id].status, "merged")

    def test_add_task_registra_pertenencia_al_sprint(self):
        self.orch.add_sprint("S01", "objetivo del sprint")
        self.add("TASK-A", sprint="S01")
        sprint = self.orch.store.load_sprints()["S01"]
        self.assertEqual(sprint.tasks, ["TASK-A"])

    def test_primer_inicio_activa_el_sprint(self):
        self.orch.add_sprint("S01", "objetivo del sprint")
        task = self.add("TASK-A", sprint="S01", agent="backend-engineer")
        self.assertEqual(self.orch.store.load_sprints()["S01"].status, "planned")
        self.orch.start_task(task.id, branch="feat/HU-1")
        self.assertEqual(self.orch.store.load_sprints()["S01"].status, "active")

    def test_cierre_de_sprint_exige_tareas_integradas(self):
        self.orch.add_sprint("S01", "objetivo del sprint")
        task = self.add("TASK-A", sprint="S01", agent="backend-engineer")
        with self.assertRaises(PolicyError):
            self.orch.close_sprint("S01")
        tasks = self.orch.store.load_tasks()
        tasks[task.id].status = "merged"
        self.orch.store.save_tasks(tasks)
        closed = self.orch.close_sprint("S01")
        self.assertEqual(closed["status"], "closed")
        self.assertTrue(closed["closed_at"])
        with self.assertRaises(PolicyError):
            self.orch.close_sprint("S01")

    def test_reporte_incluye_tareas(self):
        self.add("TASK-A", sprint="S01")
        text = self.orch.report("S01")
        self.assertIn("TASK-A", text)
        self.assertIn("Reporte de ingeniería S01", text)


if __name__ == "__main__":
    unittest.main()
