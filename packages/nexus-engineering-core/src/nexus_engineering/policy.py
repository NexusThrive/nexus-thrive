"""Política de trabajo: compuertas, enrutamiento y límites.

`workflow-policy.json` es el único lugar donde se declaran las reglas de
delegación y los comandos de verificación. Los agentes no las duplican.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


DEFAULT_POLICY: dict[str, Any] = {
    "schema_version": 1,
    "pause_file": "docs/ingenieria/PAUSA",
    "max_attempts": 3,
    "default_agent": "senior-engineer",
    "discipline_defaults": {
        "engineering": "senior-engineer",
        "design": "senior-product-designer",
        "documentation": "knowledge-engineer",
        "marketing": "marketing-director",
        "growth": "growth-engineer",
        "research": "research-engineer",
    },
    # Revisores por disciplina, en orden de preferencia. El orquestador elige el
    # primero que no sea el implementador ni el agente asignado: la revisión
    # nunca es autoaprobación.
    "review_defaults": {
        "engineering": {
            "qa": ["qa-engineer"],
            "senior_review": ["senior-reviewer"],
        },
        "design": {
            "qa": ["visual-qa-engineer", "accessibility-specialist"],
            "senior_review": ["head-of-product-design", "design-systems-lead"],
        },
        "documentation": {
            "qa": ["knowledge-engineer", "qa-engineer"],
            "senior_review": ["senior-reviewer"],
        },
        "marketing": {
            "qa": ["brand-consistency-reviewer"],
            "senior_review": ["marketing-analytics-specialist", "brand-strategist"],
        },
        "growth": {
            "qa": ["marketing-analytics-specialist"],
            "senior_review": ["marketing-director", "brand-strategist"],
        },
        "research": {
            "qa": ["knowledge-engineer", "research-engineer"],
            "senior_review": ["senior-reviewer"],
        },
    },
    "gates": {
        "lint": {"command": "pnpm lint", "required": True},
        "typecheck": {"command": "pnpm exec tsc --noEmit", "required": True},
        "test": {"command": "TEST_DATABASE_URL= pnpm test", "required": True},
        "build": {"command": "pnpm build", "required": False},
    },
    "routing": [
        {
            "agent": "design-systems-lead",
            "discipline": "design",
            "reason": "Tokens, variantes y reglas del sistema de diseño",
            "tags": ["design-system", "tokens", "token", "variante", "componente-base"],
            "paths": ["packages/brand/"],
        },
        {
            "agent": "storybook-engineer",
            "discipline": "design",
            "reason": "Historias y pruebas visuales de componentes",
            "tags": ["storybook", "historia", "stories"],
            "paths": [".storybook/"],
        },
        {
            "agent": "accessibility-specialist",
            "discipline": "design",
            "reason": "Accesibilidad, teclado, contraste o semántica",
            "tags": ["accesibilidad", "a11y", "wcag", "teclado", "contraste"],
            "paths": [],
        },
        {
            "agent": "visual-qa-engineer",
            "discipline": "design",
            "reason": "Verificación visual real en navegador",
            "tags": ["qa-visual", "regresion-visual", "screenshot"],
            "paths": ["e2e/"],
        },
        {
            "agent": "growth-engineer",
            "discipline": "growth",
            "reason": "Experimentos de adquisición, activación y retención",
            "tags": ["growth", "experimento", "conversion", "activacion", "retencion"],
            "paths": [],
        },
        {
            "agent": "seo-specialist",
            "discipline": "marketing",
            "reason": "SEO técnico, metadatos e indexación",
            "tags": ["seo", "metadatos", "sitemap", "robots", "indexacion"],
            "paths": [],
        },
        {
            "agent": "copywriter",
            "discipline": "marketing",
            "reason": "Textos de producto y campañas",
            "tags": ["copy", "copywriting", "texto", "landing", "campana", "campaña"],
            "paths": [],
        },
        {
            "agent": "frontend-engineer",
            "reason": "Interfaz, componentes o accesibilidad",
            "tags": ["frontend", "ui", "ux", "accesibilidad", "componente"],
            "paths": ["app/", "components/"],
        },
        {
            "agent": "database-engineer",
            "reason": "Esquema, migraciones o RLS",
            "tags": ["database", "prisma", "migracion", "migración", "rls", "postgres"],
            "paths": ["prisma/", "migrations/"],
        },
        {
            "agent": "integrations-engineer",
            "reason": "Webhooks, MCP o automatizaciones",
            "tags": ["integracion", "integración", "webhook", "n8n", "mcp", "graphify", "notebooklm"],
            "paths": ["integrations/"],
        },
        {
            "agent": "devops-engineer",
            "reason": "CI, despliegue o infraestructura",
            "tags": ["ci", "devops", "despliegue", "docker", "infra"],
            "paths": [".github/", "scripts/"],
        },
        {
            "agent": "security-engineer",
            "reason": "Riesgo de seguridad o datos sensibles",
            "tags": ["seguridad", "security", "secreto", "permiso", "auth"],
            "paths": [],
        },
        {
            "agent": "backend-engineer",
            "reason": "API, reglas de negocio o autorización",
            "tags": ["backend", "api", "servicio", "action", "route"],
            "paths": ["lib/", "app/api/"],
        },
    ],
}


@dataclass
class Policy:
    data: dict[str, Any] = field(default_factory=lambda: json.loads(json.dumps(DEFAULT_POLICY)))

    @classmethod
    def load(cls, path: Path | str | None = None) -> "Policy":
        candidate = Path(path) if path else Path(".product-team/workflow-policy.json")
        if not candidate.exists():
            return cls()
        with open(candidate, encoding="utf-8") as handle:
            data = json.load(handle)
        merged = json.loads(json.dumps(DEFAULT_POLICY))
        merged.update({k: v for k, v in data.items() if v not in (None, "")})
        return cls(merged)

    # --------------------------------------------------------------- helpers
    @property
    def pause_file(self) -> Path:
        return Path(self.data.get("pause_file", "docs/ingenieria/PAUSA"))

    @property
    def max_attempts(self) -> int:
        return int(self.data.get("max_attempts", 3))

    @property
    def gates(self) -> dict[str, dict[str, Any]]:
        return self.data.get("gates", {})

    def required_gates(self) -> list[str]:
        return [name for name, cfg in self.gates.items() if cfg.get("required")]

    def default_agent_for(self, discipline: str = "engineering") -> str:
        defaults = self.data.get("discipline_defaults", {})
        return defaults.get(discipline, self.data.get("default_agent", "senior-engineer"))

    def reviewers_for(
        self, discipline: str = "engineering", *, exclude: Iterable[str] = ()
    ) -> dict[str, str]:
        """Revisores sugeridos para una disciplina, sin autoaprobación.

        Devuelve ``{"qa": ..., "senior_review": ...}``. Si todos los candidatos
        están excluidos (porque implementaron la tarea), el valor queda vacío y
        el orquestador debe pedir una persona.
        """
        blocked = {item for item in exclude if item}
        defaults = self.data.get("review_defaults", {}).get(discipline, {})
        result: dict[str, str] = {}
        for kind in ("qa", "senior_review"):
            result[kind] = next(
                (candidate for candidate in defaults.get(kind, []) if candidate not in blocked),
                "",
            )
        return result

    def route(
        self,
        tags: list[str] | None = None,
        paths: list[str] | None = None,
        discipline: str | None = "engineering",
    ) -> tuple[str, str]:
        """Devuelve (agente, motivo) usando los agentes mínimos necesarios.

        Con ``discipline`` se priorizan las reglas de esa disciplina; después se
        evalúan las reglas generales. Una regla sin ``discipline`` aplica a todas.
        """
        tags_lower = {tag.lower() for tag in (tags or [])}
        paths = paths or []
        rules = list(self.data.get("routing", []))
        if discipline:
            preferred = [rule for rule in rules if rule.get("discipline") == discipline]
            general = [rule for rule in rules if rule.get("discipline") in (None, "")]
            ordered = preferred + general
        else:
            ordered = rules
        for rule in ordered:
            rule_tags = {tag.lower() for tag in rule.get("tags", [])}
            if tags_lower & rule_tags:
                return rule["agent"], rule.get("reason", "coincidencia de etiquetas")
            for prefix in rule.get("paths", []):
                if any(path.startswith(prefix) for path in paths):
                    return rule["agent"], rule.get("reason", "coincidencia de rutas")
        return self.default_agent_for(discipline or "engineering"), "sin regla específica"
