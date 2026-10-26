#!/usr/bin/env python3
"""Genera los workflows de n8n y sus esquemas, sin secretos.

Los workflows apuntan al puente autenticado del núcleo
(`nexus-eng serve`). No se importan ni ejecutan aquí: n8n no está instalado en
este entorno. La generación es determinista para que el diff sea revisable.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / "integrations" / "n8n" / "workflows"
SCHEMAS = ROOT / "integrations" / "n8n" / "schemas"
BASE_URL = "={{ $env.NEXUS_ENGINEERING_URL }}"

SPECS = {
    "A": {
        "file": "A-nueva-solicitud.json",
        "name": "NEXUS · A · Nueva solicitud",
        "event": "task.request",
        "trigger": "webhook",
        "path": "nexus/a",
        "description": "Webhook autenticado que registra una solicitud y crea el elemento de backlog en el núcleo.",
        "creates_task": True,
    },
    "B": {
        "file": "B-actualizacion-conocimiento.json",
        "name": "NEXUS · B · Actualización de conocimiento",
        "event": "knowledge.update",
        "trigger": "webhook",
        "path": "nexus/b",
        "description": "Registra una fuente nueva para el Knowledge Hub; la sincronización la decide el núcleo.",
        "creates_task": False,
    },
    "C": {
        "file": "C-ejecucion-sprint.json",
        "name": "NEXUS · C · Ejecución de sprint",
        "event": "sprint.run",
        "trigger": "webhook",
        "path": "nexus/c",
        "description": "Solicita al orquestador comprobar estado e iniciar el siguiente paso del sprint.",
        "creates_task": False,
    },
    "D": {
        "file": "D-recuperacion.json",
        "name": "NEXUS · D · Recuperación",
        "event": "recovery",
        "trigger": "schedule",
        "path": "",
        "description": "Cada 15 minutos propone reanudar tareas interrumpidas; la decisión y la validación de deriva son del núcleo.",
        "creates_task": False,
    },
    "E": {
        "file": "E-ci-revision.json",
        "name": "NEXUS · E · CI y revisión",
        "event": "task.request",
        "trigger": "webhook",
        "path": "nexus/e",
        "description": "Recibe el resultado de CI y lo entrega al núcleo para clasificar el fallo y devolverlo al responsable.",
        "creates_task": False,
    },
    "F": {
        "file": "F-informes.json",
        "name": "NEXUS · F · Informes",
        "event": "sprint.run",
        "trigger": "schedule",
        "path": "",
        "description": "Genera un informe diario con una clave de idempotencia por día.",
        "creates_task": False,
    },
    "G": {
        "file": "G-notificaciones.json",
        "name": "NEXUS · G · Notificaciones",
        "event": "task.request",
        "trigger": "webhook",
        "path": "nexus/g",
        "description": "Canal de notificaciones de bloqueos y fallos; no decide calidad.",
        "creates_task": False,
    },
    "H": {
        "file": "H-investigacion-periodica.json",
        "name": "NEXUS · H · Investigación periódica",
        "event": "knowledge.update",
        "trigger": "schedule",
        "path": "",
        "description": "Semanalmente propone revisar fuentes técnicas; nunca incorpora cambios sin validación de procedencia.",
        "creates_task": False,
    },
    "I": {
        "file": "I-preparacion-brief.json",
        "name": "NEXUS · I · Preparación de brief",
        "event": "content.brief",
        "trigger": "webhook",
        "path": "nexus/i",
        "description": "Recibe una solicitud de contenido y la registra para que el equipo prepare el brief. No redacta ni publica por sí solo.",
        "creates_task": False,
    },
    "J": {
        "file": "J-aprobacion-campana.json",
        "name": "NEXUS · J · Aprobación de campaña",
        "event": "campaign.approval",
        "trigger": "webhook",
        "path": "nexus/j",
        "description": "Registra una solicitud de aprobación de campaña. La publicación externa exige autorización humana explícita.",
        "creates_task": False,
    },
    "K": {
        "file": "K-actualizacion-metricas.json",
        "name": "NEXUS · K · Actualización de métricas",
        "event": "growth.metrics",
        "trigger": "schedule",
        "path": "",
        "description": "Diariamente solicita actualizar métricas de growth. Solo acepta datos de fuentes reales; no estima resultados.",
        "creates_task": False,
    },
}

NORMALIZE_JS = """const body = $json.body ?? $json;
const event = body.event;
const key = body.idempotency_key;
const title = body.title;
if (!event || !key || !title) {
  throw new Error('payload inválido: event, idempotency_key y title son obligatorios');
}
if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
  throw new Error('idempotency_key inválida');
}
return [{ json: {
  event,
  idempotency_key: key,
  title,
  task: body.task ?? null,
} }];
"""

SCHEDULE_BUILDERS = {
    "D": """const bucket = new Date().toISOString().slice(0, 13); // una ejecución por hora
return [{ json: {
  event: 'recovery',
  idempotency_key: `recovery-${bucket}`,
  title: 'Comprobar tareas interrumpidas',
  task: null,
} }];
""",
    "F": """const day = new Date().toISOString().slice(0, 10);
return [{ json: {
  event: 'sprint.run',
  idempotency_key: `informe-${day}`,
  title: 'Generar informe diario',
  task: null,
} }];
""",
    "H": """const week = new Date().toISOString().slice(0, 10);
return [{ json: {
  event: 'knowledge.update',
  idempotency_key: `research-${week}`,
  title: 'Revisión semanal de fuentes técnicas',
  task: null,
} }];
""",
    "K": """const day = new Date().toISOString().slice(0, 10);
return [{ json: {
  event: 'growth.metrics',
  idempotency_key: `metrics-${day}`,
  title: 'Actualizar métricas de growth desde fuentes reales',
  task: null,
} }];
""",
}


def node(name: str, type_: str, position: tuple[int, int], parameters: dict, **extra) -> dict:
    payload = {
        "parameters": parameters,
        "name": name,
        "type": type_,
        "typeVersion": extra.pop("typeVersion", 1),
        "position": list(position),
    }
    payload.update(extra)
    return payload


def credential(name: str) -> dict:
    # Solo nombre de credencial: n8n la resuelve en su almacén. Nunca hay secretos aquí.
    return {"id": None, "name": name}


def normalize_node() -> dict:
    return node(
        "Normalizar evento",
        "n8n-nodes-base.code",
        (460, 300),
        {"jsCode": NORMALIZE_JS},
        typeVersion=2,
    )


def http_node(workflow: str) -> dict:
    return node(
        "Entregar al núcleo",
        "n8n-nodes-base.httpRequest",
        (700, 300),
        {
            "method": "POST",
            "url": f"{BASE_URL}/webhooks/n8n/{workflow}",
            "authentication": "genericCredentialType",
            "genericAuthType": "httpHeaderAuth",
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify($json) }}",
            "options": {"timeout": 15000},
        },
        typeVersion=4.2,
        retryOnFail=True,
        maxTries=3,
        waitBetweenTries=2000,
        credentials={"httpHeaderAuth": credential("NEXUS ingeniería API")},
    )


def respond_node() -> dict:
    return node(
        "Responder",
        "n8n-nodes-base.respondToWebhook",
        (940, 300),
        {"respondWith": "json", "responseBody": "={{ JSON.stringify($json) }}"},
        typeVersion=1.1,
    )


def webhook_node(workflow: str, path: str) -> dict:
    return node(
        "Webhook autenticado",
        "n8n-nodes-base.webhook",
        (220, 300),
        {
            "httpMethod": "POST",
            "path": path,
            "authentication": "headerAuth",
            "responseMode": "responseNode",
            "options": {},
        },
        typeVersion=2,
        webhookId=str(uuid.uuid5(uuid.NAMESPACE_URL, f"nexus-n8n-{workflow}")),
        credentials={"httpHeaderAuth": credential("NEXUS n8n webhook")},
    )


def schedule_node(workflow: str) -> dict:
    if workflow == "D":
        rule = {"rule": {"interval": [{"field": "minutes", "minutesInterval": 15}]}}
    elif workflow in {"F", "K"}:
        rule = {"rule": {"interval": [{"field": "hours", "hoursInterval": 24}]}}
    else:
        rule = {"rule": {"interval": [{"field": "weeks", "weeksInterval": 1}]}}
    return node("Disparador programado", "n8n-nodes-base.scheduleTrigger", (220, 300), rule, typeVersion=1.2)


def sticky_note(spec: dict, workflow: str) -> dict:
    content = (
        f"## Flujo {workflow}: {spec['name'].split('·')[-1].strip()}\n\n"
        f"{spec['description']}\n\n"
        "**Requisitos**\n"
        "- Credencial `NEXUS n8n webhook` (Header Auth) para la entrada.\n"
        "- Credencial `NEXUS ingeniería API` (Header Auth) para el puente.\n"
        "- `NEXUS_ENGINEERING_URL` apuntando al núcleo (sin barra final).\n"
        "- Idempotencia: la clave se reenvía; el núcleo responde `duplicate` sin repetir la operación.\n"
        "- Sin secretos en este JSON.\n\n"
        "**Estado**\nGenerado y validado como JSON; importación n8n no verificada en este entorno."
    )
    return node(
        "Nota operativa",
        "n8n-nodes-base.stickyNote",
        (-80, 520),
        {"content": content, "height": 300, "width": 420},
        typeVersion=1,
    )


def build(workflow: str, spec: dict) -> dict:
    nodes = [sticky_note(spec, workflow)]
    connections: dict[str, dict] = {}
    if spec["trigger"] == "webhook":
        nodes.append(webhook_node(workflow, spec["path"]))
        nodes.append(normalize_node())
        chain = ["Webhook autenticado", "Normalizar evento", "Entregar al núcleo", "Responder"]
        nodes.append(http_node(workflow))
        nodes.append(respond_node())
        for source, target in zip(chain, chain[1:]):
            connections[source] = {"main": [[{"node": target, "type": "main", "index": 0}]]}
    else:
        nodes.append(schedule_node(workflow))
        nodes.append(
            node(
                "Construir evento",
                "n8n-nodes-base.code",
                (460, 300),
                {"jsCode": SCHEDULE_BUILDERS[workflow]},
                typeVersion=2,
            )
        )
        nodes.append(http_node(workflow))
        nodes.append(
            node(
                "Registrar resultado",
                "n8n-nodes-base.noOp",
                (940, 300),
                {},
            )
        )
        chain = ["Disparador programado", "Construir evento", "Entregar al núcleo", "Registrar resultado"]
        for source, target in zip(chain, chain[1:]):
            connections[source] = {"main": [[{"node": target, "type": "main", "index": 0}]]}

    return {
        "name": spec["name"],
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {
            "executionOrder": "v1",
            "executionTimeout": 60,
            "saveExecutionProgress": True,
            "saveDataErrorExecution": "all",
            "saveDataSuccessExecution": "all",
            "saveManualExecutions": True,
        },
        "pinData": {},
        "versionId": str(uuid.uuid5(uuid.NAMESPACE_URL, f"nexus-workflow-{workflow}")),
        "meta": {"templateCredsSetupCompleted": False},
        "tags": [],
    }


def schema(workflow: str, spec: dict) -> dict:
    properties = {
        "event": {"type": "string", "const": spec["event"]},
        "idempotency_key": {
            "type": "string",
            "pattern": "^[A-Za-z0-9._:-]{8,128}$",
        },
        "title": {"type": "string", "minLength": 1, "maxLength": 200},
        "task": {
            "type": ["object", "null"],
            "properties": {
                "id": {"type": "string"},
                "title": {"type": "string"},
                "story": {"type": "string"},
                "discipline": {
                    "type": "string",
                    "enum": ["engineering", "design", "documentation", "marketing", "growth", "research"],
                },
                "priority": {"type": "integer", "minimum": 0, "maximum": 3},
                "depends_on": {"type": "array", "items": {"type": "string"}},
                "tags": {"type": "array", "items": {"type": "string"}},
                "paths": {"type": "array", "items": {"type": "string"}},
            },
            "additionalProperties": False,
        },
    }
    if workflow != "A":
        properties.pop("task")
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"https://nexus.local/schemas/n8n/{workflow}.json",
        "title": spec["name"],
        "type": "object",
        "required": ["event", "idempotency_key", "title"],
        "properties": properties,
        "additionalProperties": False,
    }


def main() -> int:
    WORKFLOWS.mkdir(parents=True, exist_ok=True)
    SCHEMAS.mkdir(parents=True, exist_ok=True)
    for workflow, spec in SPECS.items():
        (WORKFLOWS / spec["file"]).write_text(
            json.dumps(build(workflow, spec), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        (SCHEMAS / f"{workflow}.json").write_text(
            json.dumps(schema(workflow, spec), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    print(f"Generados {len(SPECS)} workflows y {len(SPECS)} esquemas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
