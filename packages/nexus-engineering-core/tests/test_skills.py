"""Pruebas del registro de skills: huellas, licencias y revisión de seguridad."""
from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path

import support

from nexus_engineering.skills import (
    RegistryError,
    content_hash,
    load_registry,
    summarize,
    update_hashes,
    validate_registry,
)

REPO = support.CORE.parents[1]
REGISTRY = REPO / ".product-team" / "skills-registry.json"


class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_registro_real_es_valido(self):
        report = validate_registry(self.data, REPO)
        self.assertTrue(report["ok"], report["problems"])

    def test_registro_inexistente_falla(self):
        with self.assertRaises(RegistryError):
            load_registry(self.root / "no-existe.json")

    def test_huella_distinta_bloquea(self):
        data = copy.deepcopy(self.data)
        active = next(item for item in data["skills"] if item["kind"] == "skill")
        active["content_hash"] = "0" * 64
        report = validate_registry(data, REPO)
        self.assertFalse(report["ok"])
        self.assertTrue(any("huella distinta" in problem for problem in report["problems"]))

    def test_skill_activa_sin_revision_bloquea(self):
        data = copy.deepcopy(self.data)
        active = next(item for item in data["skills"] if item["kind"] == "skill")
        active["security_review"] = {"status": "pending"}
        report = validate_registry(data, REPO)
        self.assertFalse(report["ok"])
        self.assertTrue(any("revisión de seguridad" in problem for problem in report["problems"]))

    def test_licencia_no_admitida_bloquea(self):
        data = copy.deepcopy(self.data)
        data["skills"][0]["license"] = "WTFPL"
        report = validate_registry(data, REPO)
        self.assertFalse(report["ok"])

    def test_rechazada_sin_motivo_bloquea(self):
        data = copy.deepcopy(self.data)
        rejected = next(item for item in data["skills"] if item["status"] == "rejected")
        rejected.pop("reason", None)
        report = validate_registry(data, REPO)
        self.assertFalse(report["ok"])
        self.assertTrue(any("rechazada sin motivo" in problem for problem in report["problems"]))

    def test_herramienta_activa_exige_prueba_y_riesgos(self):
        data = copy.deepcopy(self.data)
        tool = next(item for item in data["skills"] if item["kind"] == "tool")
        tool.pop("test", None)
        report = validate_registry(data, REPO)
        self.assertFalse(report["ok"])

    def test_update_hashes_es_estable(self):
        data = update_hashes(copy.deepcopy(self.data), REPO)
        hashes = {item["id"]: item.get("content_hash") for item in data["skills"]}
        again = update_hashes(copy.deepcopy(data), REPO)
        self.assertEqual(hashes, {item["id"]: item.get("content_hash") for item in again["skills"]})
        self.assertEqual(content_hash(REPO / "skills" / "ciclo-sprint"), hashes["ciclo-sprint"])

    def test_summary_cuenta_por_estado_y_tipo(self):
        summary = summarize(self.data)
        self.assertEqual(summary["total"], len(self.data["skills"]))
        self.assertGreaterEqual(summary["by_status"].get("active", 0), 17)
        self.assertIn("tool", summary["by_kind"])


if __name__ == "__main__":
    unittest.main()
