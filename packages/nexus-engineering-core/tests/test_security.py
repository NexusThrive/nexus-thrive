"""Pruebas de seguridad: redacción, webhooks y guardas de Git."""
from __future__ import annotations

import unittest

import support  # noqa: F401

from nexus_engineering.gitguard import (
    GitError,
    assert_safe_command,
    validate_sprint_branch,
    validate_work_branch,
)
from nexus_engineering.security import redact, validate_webhook_payload


class RedactionTests(unittest.TestCase):
    def test_redacta_claves_y_tokens(self):
        text = "API_KEY=super-secreta-123456 y Bearer abcdefghijklmnopqrstuvwxyz"
        cleaned = redact(text)
        self.assertNotIn("super-secreta-123456", cleaned)
        self.assertNotIn("abcdefghijklmnopqrstuvwxyz", cleaned)
        self.assertIn("[REDACTADO]", cleaned)

    def test_redacta_url_de_base_de_datos(self):
        cleaned = redact("postgresql://user:clave-real@db.local:5432/nexus")
        self.assertNotIn("clave-real", cleaned)

    def test_redacta_jwt(self):
        token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop"
        self.assertNotIn(token, redact(f"token {token}"))


class WebhookTests(unittest.TestCase):
    def test_payload_valido(self):
        clean = validate_webhook_payload(
            {"event": "task.request", "idempotency_key": "evt-12345678", "title": "Nueva HU"}
        )
        self.assertEqual(clean["event"], "task.request")

    def test_rechaza_evento_no_autorizado(self):
        with self.assertRaises(ValueError):
            validate_webhook_payload(
                {"event": "rm -rf", "idempotency_key": "evt-12345678", "title": "x"}
            )

    def test_rechaza_clave_corta(self):
        with self.assertRaises(ValueError):
            validate_webhook_payload({"event": "task.request", "idempotency_key": "corta", "title": "x"})


class GitGuardTests(unittest.TestCase):
    def test_ramas_de_trabajo_validas(self):
        validate_work_branch("feat/HU-CRM-014")
        validate_sprint_branch("sprint/S01")

    def test_rechaza_main_y_sprint(self):
        with self.assertRaises(GitError):
            validate_work_branch("main")
        with self.assertRaises(GitError):
            validate_work_branch("sprint/S01")

    def test_rechaza_force_y_no_verify(self):
        for argv in (["push", "--force", "origin", "x"], ["commit", "--no-verify"], ["push", "-f"]):
            with self.assertRaises(GitError):
                assert_safe_command(argv)

    def test_rechaza_push_directo_a_main(self):
        with self.assertRaises(GitError):
            assert_safe_command(["push", "origin", "main"])


if __name__ == "__main__":
    unittest.main()
