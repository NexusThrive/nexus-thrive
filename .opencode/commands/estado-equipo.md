---
description: Muestra el estado real del equipo, bloqueos y siguiente tarea
agent: engineering-manager
---

Genera el estado del equipo.

1. Ejecuta:
   - `scripts/nexus-eng status --json`
   - `scripts/nexus-eng readiness --json`
   - `scripts/nexus-eng health --json`
2. Resume en una tabla: tareas por estado, intentos al límite, bloqueos con causa,
   pausa activa/no activa y siguiente tarea ejecutable.
3. Para cada tarea bloqueada, indica la próxima acción concreta y quién debe
   resolverla.
4. Comprueba que OpenCode y Claude Code ven el mismo estado: el estado canónico
   es `.product-team/state`, no la memoria de la conversación.
5. No inventes métricas: si un dato no existe, escribe "no disponible".

$ARGUMENTS
