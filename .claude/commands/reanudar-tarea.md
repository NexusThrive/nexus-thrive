---
description: Reanuda una tarea interrumpida comprobando deriva del checkpoint
agent: engineering-manager
---

Reanuda la tarea: $ARGUMENTS

1. `scripts/nexus-eng recover <id> --client opencode --json`.
2. Si el estado es `drift`, **no continúes**: explica qué cambió y pide decisión
   humana (commit, descarte o nuevo checkpoint justificado).
3. Si es `resumable`, verifica con Git:
   - rama actual y commit base
   - archivos modificados frente al checkpoint
   - último resultado de pruebas registrado
4. Revisa el estado de la tarea y sus dependencias. Si una dependencia dejó de
   estar `merged`, bloquea la tarea en vez de continuar.
5. Retoma exactamente desde `next_action`, sin repetir operaciones ya hechas.
6. Registra el nuevo checkpoint con `--client opencode` (o `claude-code`) antes de
   seguir trabajando.

Si no existe checkpoint, reconstruye el estado desde Git y las pruebas, y crea
uno nuevo antes de implementar.

Nunca reinicies una tarea desde cero si ya hay trabajo válido.
