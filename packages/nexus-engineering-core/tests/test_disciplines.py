"""Pruebas de las disciplinas y de los ciclos de trabajo compartidos."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import support

from nexus_engineering.domain import PolicyError, Task, loop_stages, normalize_discipline
from nexus_engineering.orchestrator import Orchestrator
from nexus_engineering.policy import Policy
from nexus_engineering.store import StateStore


class DisciplineTests(unittest.TestCase):
    def test_disciplina_por_defecto_es_ingenieria(self):
        self.assertEqual(normalize_discipline(None), "engineering")
        self.assertEqual(normalize_discipline(""), "engineering")

    def test_disciplina_desconocida_se_rechaza(self):
        with self.assertRaises(PolicyError):
            normalize_discipline("ventas-magicas")

    def test_ciclos_tienen_etapas_propias(self):
        self.assertIn("implementar", loop_stages("engineering"))
        self.assertIn("qa-visual", loop_stages("design"))
        self.assertIn("publicar-autorizado", loop_stages("marketing"))
        self.assertIn("medir", loop_stages("growth"))

    def test_tarea_expone_su_ciclo(self):
        item = Task(id="T-1", title="Rediseñar", discipline="design")
        self.assertEqual(item.loop()["discipline"], "design")
        self.assertIn("auditar", item.loop()["stages"])


class RoutingTests(unittest.TestCase):
    def setUp(self):
        self.policy = Policy(data=support.DEFAULT_POLICY)

    def test_ingenieria_conserva_su_ruta(self):
        agent, _ = self.policy.route(tags=["api", "backend"], discipline="engineering")
        self.assertEqual(agent, "backend-engineer")

    def test_diseno_enruta_a_especialista_de_estudio(self):
        agent, _ = self.policy.route(tags=["tokens", "variante"], discipline="design")
        self.assertEqual(agent, "design-systems-lead")

    def test_growth_enruta_a_growth_engineer(self):
        agent, _ = self.policy.route(tags=["experimento", "conversion"], discipline="growth")
        self.assertEqual(agent, "growth-engineer")

    def test_sin_regla_usa_el_agente_por_defecto_de_la_disciplina(self):
        agent, reason = self.policy.route(tags=["sin-coincidencia"], discipline="marketing")
        self.assertEqual(agent, "marketing-director")
        self.assertEqual(reason, "sin regla específica")

    def test_revisores_por_disciplina_son_independientes(self):
        plan = self.policy.reviewers_for("design")
        self.assertEqual(plan["qa"], "visual-qa-engineer")
        self.assertEqual(plan["senior_review"], "head-of-product-design")
        shifted = self.policy.reviewers_for(
            "design", exclude={"visual-qa-engineer", "head-of-product-design"}
        )
        self.assertEqual(shifted["qa"], "accessibility-specialist")
        self.assertEqual(shifted["senior_review"], "design-systems-lead")

    def test_sin_candidato_independiente_no_inventa_revisor(self):
        todos = {"visual-qa-engineer", "accessibility-specialist", "head-of-product-design", "design-systems-lead"}
        plan = self.policy.reviewers_for("design", exclude=todos)
        self.assertEqual(plan, {"qa": "", "senior_review": ""})


class OrchestratorDisciplineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.repo = support.make_repo(self.root)
        self.store = support.make_store(self.root)
        self.store.initialize()
        self.orch = Orchestrator(
            store=self.store, policy=support.make_policy(self.root), repo=self.repo
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_tarea_de_diseno_persiste_disciplina_y_asigna_agente(self):
        task = self.orch.add_task(
            {
                "id": "TASK-D1",
                "title": "Normalizar tokens",
                "discipline": "design",
                "tags": ["tokens"],
                "paths": ["packages/brand/"],
            }
        )
        self.assertEqual(task.discipline, "design")
        result = self.orch.assign("TASK-D1")
        self.assertEqual(result["agent"], "design-systems-lead")
        reloaded = StateStore(self.root / "state").get_task("TASK-D1")
        self.assertEqual(reloaded.discipline, "design")

    def test_disciplina_invalida_no_crea_tarea(self):
        with self.assertRaises(PolicyError):
            self.orch.add_task({"title": "x", "discipline": "inexistente"})
        self.assertEqual(self.store.load_tasks(), {})

    def test_review_plan_excluye_al_implementador(self):
        self.orch.add_task(
            {
                "id": "TASK-D2",
                "title": "Revisar contraste",
                "discipline": "design",
                "tags": ["accesibilidad"],
            }
        )
        self.orch.assign("TASK-D2")
        self.orch.start_task("TASK-D2", agent="accessibility-specialist", allow_dirty=True)
        plan = self.orch.review_plan("TASK-D2")
        self.assertEqual(plan["discipline"], "design")
        self.assertEqual(plan["reviewers"]["qa"], "visual-qa-engineer")
        self.assertNotEqual(plan["reviewers"]["senior_review"], "accessibility-specialist")
        self.assertEqual(plan["missing"], [])


if __name__ == "__main__":
    unittest.main()
