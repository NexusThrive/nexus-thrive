"""Pruebas del Knowledge Hub: procedencia, duplicados, sync y degradación."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import support

from nexus_engineering.knowledge import KnowledgeHub, graphify_status


class KnowledgeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.repo = support.make_repo(self.root)
        self.store = support.make_store(self.root)
        self.store.initialize()
        self.hub = KnowledgeHub(store=self.store, repo=self.repo)

    def tearDown(self):
        self.tmp.cleanup()

    def test_procedencia_obligatoria(self):
        with self.assertRaises(ValueError):
            self.hub.add(title="Sin origen", kind="project_docs", location="lib/a.ts", provenance="")

    def test_detecta_duplicados_por_contenido(self):
        first = self.hub.add(
            title="Doc A",
            kind="project_docs",
            location="lib/a.ts",
            provenance="repo",
        )
        self.assertEqual(first["state"], "created")
        second = self.hub.add(
            title="Doc A copia",
            kind="project_docs",
            location="lib/a.ts",
            provenance="repo",
        )
        self.assertEqual(second["state"], "duplicate")
        self.assertEqual(second["source"]["id"], first["source"]["id"])

    def test_sync_local_registra_cambio_y_fallo(self):
        source = self.hub.add(
            title="Doc A", kind="project_docs", location="lib/a.ts", provenance="repo"
        )["source"]
        result = self.hub.sync("local", source["id"])
        run = result["runs"][0]
        self.assertEqual(run["status"], "skipped")  # sin cambios

        (self.repo / "lib" / "a.ts").write_text("export const a = 2;\n", encoding="utf-8")
        run = self.hub.sync("local", source["id"])["runs"][0]
        self.assertEqual(run["status"], "ok")

        history = self.hub.sync_history()
        self.assertGreaterEqual(len(history), 2)

    def test_sync_local_de_archivo_ausente_queda_registrado(self):
        source = self.hub.add(
            title="Fuente futura", kind="project_docs", location="lib/no-existe.md", provenance="repo"
        )["source"]
        run = self.hub.sync("local", source["id"])["runs"][0]
        self.assertEqual(run["status"], "error")
        self.assertIn("no encontrado", run["detail"])
        # El estado anterior no se pierde.
        self.assertEqual(self.hub.show(source["id"])["status"], "stale")

    def test_graphify_no_disponible_no_rompe(self):
        source = self.hub.add(
            title="Doc A", kind="project_docs", location="lib/a.ts", provenance="repo"
        )["source"]
        result = self.hub.sync("graphify", source["id"])
        self.assertFalse(result["available"])
        self.assertEqual(result["runs"][0]["status"], "unavailable")
        self.assertEqual(self.hub.show(source["id"])["status"], "active")

    def test_notebooklm_no_configurado_se_declara(self):
        source = self.hub.add(
            title="Doc A", kind="research", url="https://example.com", provenance="oficial", confidence="high"
        )["source"]
        result = self.hub.sync("notebooklm", source["id"])
        self.assertEqual(result["runs"][0]["status"], "unavailable")
        self.assertIn("NotebookLM", result["runs"][0]["detail"])

    def test_busqueda_local(self):
        self.hub.add(title="Prisma RLS", kind="project_docs", tags=["prisma", "rls"], location="lib/a.ts", provenance="repo")
        hits = self.hub.search("prisma")
        self.assertEqual(len(hits), 1)

    def test_graphify_status_honesto(self):
        status = graphify_status(self.repo)
        self.assertIn("installed", status)
        self.assertFalse(status["installed"])

    def test_graphify_detecta_venv_local_y_grafo(self):
        binary = self.repo / ".tools" / "graphify" / "bin" / "graphify"
        binary.parent.mkdir(parents=True, exist_ok=True)
        binary.write_text("#!/bin/sh\necho 'graphify 9.9.9'\n", encoding="utf-8")
        binary.chmod(0o755)
        graph = self.repo / "graphify-out" / "graph.json"
        graph.parent.mkdir(parents=True, exist_ok=True)
        graph.write_text("{}", encoding="utf-8")

        status = graphify_status(self.repo)
        self.assertTrue(status["installed"])
        self.assertEqual(status["version"], "graphify 9.9.9")
        self.assertEqual(status["artifacts"], ["graphify-out/graph.json"])
        self.assertFalse(status["stale"])


if __name__ == "__main__":
    unittest.main()
