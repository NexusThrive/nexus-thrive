"""Pruebas de coherencia entre registro de agentes, workflows n8n y esquemas."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

import support

REPO = support.CORE.parents[1]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


class AgentRegistryTests(unittest.TestCase):
    def setUp(self):
        self.registry = load(REPO / ".product-team" / "agent-registry.json")
        self.agents = self.registry["agents"]

    def test_dos_equipos_con_roles_esperados(self):
        engineering = [item for item in self.agents if item["team"] == "engineering"]
        studio = [item for item in self.agents if item["team"] == "studio"]
        self.assertEqual(len(engineering), 18)
        self.assertEqual(len(studio), 20)
        self.assertEqual(len(self.agents), 38)

    def test_perfiles_de_ingenieria_se_conservan(self):
        expected = {
            "engineering-manager",
            "mesa-de-trabajo",
            "product-owner",
            "requirements-analyst",
            "project-manager",
            "arquitecto",
            "senior-engineer",
            "backend-engineer",
            "frontend-engineer",
            "database-engineer",
            "integrations-engineer",
            "devops-engineer",
            "security-engineer",
            "qa-engineer",
            "senior-reviewer",
            "knowledge-engineer",
            "research-engineer",
            "release-manager",
        }
        self.assertTrue(expected.issubset({item["id"] for item in self.agents}))

    def test_studio_cubre_direccion_diseno_marca_y_crecimiento(self):
        ids = {item["id"] for item in self.agents}
        expected = {
            "head-of-product-design",
            "senior-product-designer",
            "design-systems-lead",
            "ux-researcher",
            "accessibility-specialist",
            "frontend-design-engineer",
            "storybook-engineer",
            "visual-qa-engineer",
            "brand-strategist",
            "art-director",
            "brand-designer",
            "brand-consistency-reviewer",
            "marketing-director",
            "content-strategist",
            "copywriter",
            "seo-specialist",
            "growth-engineer",
            "social-media-strategist",
            "sales-enablement-specialist",
            "marketing-analytics-specialist",
        }
        self.assertEqual(expected, ids & expected)

    def test_todos_los_perfiles_tienen_contrato_completo(self):
        required = (
            "responsibility",
            "objective",
            "scope",
            "inputs",
            "outputs",
            "decisions",
            "completion",
            "escalation",
            "autonomy",
            "team",
            "category",
        )
        for agent in self.agents:
            for field in required:
                self.assertTrue(agent.get(field), f"{agent['id']}: falta {field}")
            self.assertIn("in", agent["scope"])
            self.assertIn("out", agent["scope"])
            self.assertTrue(agent["scope"]["out"], f"{agent['id']}: sin límites explícitos")

    def test_adaptadores_coinciden_con_el_registro(self):
        ids = {item["id"] for item in self.agents}
        opencode = {path.stem for path in (REPO / ".opencode/agents").glob("*.md")}
        claude = {path.stem for path in (REPO / ".claude/agents").glob("*.md")}
        self.assertTrue(ids.issubset(opencode))
        self.assertTrue(ids.issubset(claude))


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.policy = load(REPO / ".product-team" / "workflow-policy.json")
        self.workflows_dir = REPO / "integrations" / "n8n" / "workflows"
        self.schemas_dir = REPO / "integrations" / "n8n" / "schemas"

    def test_hay_un_workflow_por_cada_evento_declarado(self):
        self.assertEqual(len(list(self.workflows_dir.glob("*.json"))), len(self.policy["workflows"]))
        for workflow_id in self.policy["workflows"]:
            self.assertTrue(list(self.workflows_dir.glob(f"{workflow_id}-*.json")))

    def test_workflows_tienen_disparador_y_entrega_autenticada(self):
        for path in sorted(self.workflows_dir.glob("*.json")):
            workflow_id = path.name.split("-", 1)[0]
            data = load(path)
            types = {node["type"] for node in data["nodes"]}
            self.assertTrue(
                {"n8n-nodes-base.webhook", "n8n-nodes-base.scheduleTrigger"} & types,
                f"{path.name}: sin disparador",
            )
            http = [node for node in data["nodes"] if node["type"] == "n8n-nodes-base.httpRequest"]
            self.assertEqual(len(http), 1, f"{path.name}: entrega HTTP única")
            params = http[0]["parameters"]
            self.assertEqual(params["authentication"], "genericCredentialType")
            self.assertIn(f"/webhooks/n8n/{workflow_id}", params["url"])
            text = path.read_text(encoding="utf-8")
            for marker in ("sk-", "Bearer eyJ", "postgres://user:password"):
                self.assertNotIn(marker, text, f"{path.name}: posible secreto")

    def test_esquemas_exigen_idempotencia(self):
        for path in sorted(self.schemas_dir.glob("*.json")):
            schema = load(path)
            self.assertIn("idempotency_key", schema["required"])
            self.assertEqual(
                schema["properties"]["idempotency_key"]["pattern"],
                "^[A-Za-z0-9._:-]{8,128}$",
            )

    def test_flujos_de_marketing_declaran_aprobacion(self):
        approval = load(next(self.workflows_dir.glob("J-*.json")))
        metrics = load(next(self.workflows_dir.glob("K-*.json")))
        self.assertIn("content.brief", json.dumps(load(self.schemas_dir / "I.json"), ensure_ascii=False))
        self.assertIn("campaign.approval", json.dumps(load(self.schemas_dir / "J.json"), ensure_ascii=False))
        self.assertIn("autorización humana", json.dumps(approval, ensure_ascii=False))
        self.assertIn("growth.metrics", json.dumps(metrics, ensure_ascii=False))


if __name__ == "__main__":
    unittest.main()
