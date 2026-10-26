"""Pruebas de la máquina de estados y de la independencia de revisión."""
from __future__ import annotations

import unittest

import support  # noqa: F401  (configura sys.path)

from nexus_engineering.domain import (
    PolicyError,
    Task,
    TransitionError,
    validate_transition_graph,
)


def task(**overrides):
    base = {
        "id": "TASK-1",
        "title": "Implementar algo",
        "agent": "backend-engineer",
        "implementer": "backend-engineer",
    }
    base.update(overrides)
    return Task(**base)


class TransitionTests(unittest.TestCase):
    def test_no_se_puede_integrar_desde_in_progress(self):
        item = task(status="in_progress")
        with self.assertRaises(TransitionError):
            item.transition("merged", actor="release-manager")

    def test_no_se_puede_revisar_sin_compuerta(self):
        item = task(status="in_progress")
        with self.assertRaises(PolicyError):
            item.transition("review", actor="engineering-manager")

    def test_no_se_verifica_sin_qa_y_revision_senior(self):
        item = task(status="review")
        with self.assertRaises(PolicyError):
            item.transition("verified", actor="qa-engineer")

    def test_revisor_no_puede_ser_implementador(self):
        item = task(status="review")
        item.reviews = []
        from nexus_engineering.domain import Finding

        item.reviews.append(Finding(kind="qa", verdict="approved", reviewer="backend-engineer", summary="ok"))
        item.reviews.append(
            Finding(kind="senior_review", verdict="approved", reviewer="senior-reviewer", summary="ok")
        )
        with self.assertRaises(PolicyError):
            item.transition("verified", actor="qa-engineer")

    def test_flujo_feliz_completo(self):
        item = task(status="in_progress")
        from nexus_engineering.domain import Finding

        item.verification.append(
            Finding(kind="local_gate", verdict="passed", reviewer="ci", summary="compuerta test: OK")
        )
        item.transition("review", actor="engineering-manager")
        item.reviews.append(Finding(kind="qa", verdict="approved", reviewer="qa-engineer", summary="ok"))
        item.reviews.append(
            Finding(kind="senior_review", verdict="approved", reviewer="senior-reviewer", summary="ok")
        )
        item.transition("verified", actor="qa-engineer")
        item.stage = "ci_green"
        item.transition("merged", actor="release-manager")
        self.assertEqual(item.status, "merged")

    def test_grafo_de_estados_es_coherente(self):
        validate_transition_graph()

    def test_no_hay_transiciones_desde_terminales(self):
        for status in ("merged", "cancelled"):
            item = task(status=status)
            with self.assertRaises(TransitionError):
                item.transition("in_progress", actor="x")


if __name__ == "__main__":
    unittest.main()
