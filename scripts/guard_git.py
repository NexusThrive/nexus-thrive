#!/usr/bin/env python3
"""Hook de Claude Code: bloquea comandos Git peligrosos antes de ejecutarlos.

Lee el JSON de PreToolUse por stdin. Deniega con exit 2 y un motivo en stderr.
Si el payload no se puede interpretar, permite (falla abierto) porque el hook no
es la única barrera: el núcleo también rechaza estas operaciones.
"""
from __future__ import annotations

import json
import re
import sys

FORBIDDEN = [
    (r"\bgit\s+push\b[^\n]*(--force|-f\b|--force-with-lease)", "force push prohibido"),
    (r"\bgit\s+push\s+(origin\s+)?(main|master)\b", "push directo a main prohibido"),
    (r"\bgit\s+push\s+(origin\s+)?sprint/", "push directo a sprint/* prohibido"),
    (r"\bgit\s+commit\b[^\n]*--no-verify", "--no-verify prohibido"),
    (r"\bgit\s+merge\b[^\n]*\bmain\b", "merge a main requiere PR humano"),
    (r"\bgh\s+pr\s+merge\b", "merge de PR requiere aprobación humana"),
    (r"\bgit\s+reset\s+--hard\b", "reset --hard requiere confirmación humana"),
    (r"\bgit\s+clean\s+-[a-zA-Z]*f", "git clean forzado requiere confirmación humana"),
]


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    command = (payload.get("tool_input") or {}).get("command", "")
    for pattern, reason in FORBIDDEN:
        if re.search(pattern, command):
            print(f"BLOQUEADO: {reason}. Comando: {command[:200]}", file=sys.stderr)
            return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
