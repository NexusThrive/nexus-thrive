"""Redacción de secretos y validación de entradas no confiables."""
from __future__ import annotations

import re

# Patrones deliberadamente conservadores: prefieren redactar de más a filtrar.
_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("private_key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S)),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")),
    ("bearer", re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]{12,}")),
    ("api_key", re.compile(r"\b(?:sk|pk|rk|ghp|gho|ghs|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b")),
    ("assignment", re.compile(
        r"(?i)\b(api[_-]?key|secret|token|password|passwd|contrase(?:n|ñ)a|authorization)"
        r"(\s*[:=]\s*)(['\"]?)([^\s'\",;]{6,})\3"
    )),
    ("database_url", re.compile(r"(?i)\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?)://[^\s:@/]+:[^\s@/]+@")),
]

REDACTED = "[REDACTADO]"


def redact(text: str) -> str:
    """Devuelve el texto sin credenciales evidentes."""
    if not text:
        return ""
    result = text
    for name, pattern in _PATTERNS:
        if name == "assignment":
            result = pattern.sub(lambda m: f"{m.group(1)}{m.group(2)}{REDACTED}", result)
        elif name == "database_url":
            result = pattern.sub(lambda m: f"{m.group(1)}://{REDACTED}@", result)
        else:
            result = pattern.sub(REDACTED, result)
    return result


def assert_no_secrets(text: str) -> None:
    if redact(text) != text:
        raise ValueError("El contenido parece incluir credenciales; se rechaza su persistencia.")


def sanitize_filename(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-.")
    return cleaned[:120] or "sin-nombre"


def validate_webhook_payload(payload: dict[str, object]) -> dict[str, str]:
    """Valida el contrato mínimo del webhook de n8n (Flujo A)."""
    required = ("event", "idempotency_key", "title")
    missing = [key for key in required if not str(payload.get(key, "")).strip()]
    if missing:
        raise ValueError(f"Webhook inválido: faltan campos {missing}")
    event = str(payload["event"]).strip()
    if event not in {"task.request", "knowledge.update", "sprint.run", "recovery"}:
        raise ValueError(f"Evento no autorizado: {event}")
    key = str(payload["idempotency_key"]).strip()
    if not re.fullmatch(r"[A-Za-z0-9._:-]{8,128}", key):
        raise ValueError("idempotency_key inválida")
    return {
        "event": event,
        "idempotency_key": key,
        "title": str(payload["title"]).strip()[:200],
    }
