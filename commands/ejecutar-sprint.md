---
description: Ejecuta el sprint con loops verificables, QA y revisión independiente
agent: engineering-manager
---

Ejecuta el sprint: $ARGUMENTS

Repite este loop hasta que no haya tareas ejecutables o se active una parada:

1. `scripts/nexus-eng next --json` y `scripts/nexus-eng status --json`.
   - `paused` → detente; informa el archivo de pausa y el estado actual.
   - `empty` → cierra el sprint; pasa a reporte.
2. Comprueba el árbol de Git. Si está sucio, detente y pide commit/stash; no
   inicies dos historias sobre el mismo árbol.
3. Crea la rama de trabajo `<tipo>/<HU>` desde la rama de sprint y arranca:
   `scripts/nexus-eng start <id> --branch <rama> --origin opencode`
4. Delega en el especialista que indique la política:
   `scripts/nexus-eng route --tags <tags> --paths <rutas>`.
   El agente implementa **y escribe pruebas**.
5. Ejecuta la compuerta real: `scripts/nexus-eng verify <id> --gate required`.
   - Si falla: analiza la causa, corrige y repite (`retry` solo si hace falta).
   - Nunca reduzcas cobertura ni cambies criterios para pasar.
6. Guarda checkpoint **antes** de cualquier interrupción:
   `scripts/nexus-eng checkpoint <id> --agent <agente> --files <archivos> --tests <pruebas> --client opencode`
7. `scripts/nexus-eng request-review <id>`.
8. QA independiente (`qa-engineer`): verifica criterios y registra
   `scripts/nexus-eng review <id> --kind qa --verdict approved|changes_requested --reviewer qa-engineer`.
9. Revisión senior (`senior-reviewer`): revisa el diff completo y registra
   `scripts/nexus-eng review <id> --kind senior_review --verdict ... --reviewer senior-reviewer`.
   El implementador nunca emite el veredicto.
10. Si hay cambios solicitados: vuelve al paso 4 respetando el límite de 3
    intentos. Al llegar al límite, bloquea la tarea y escala al humano.
11. Con CI verde: `scripts/nexus-eng ci-green <id> --evidence <url>` y
    `scripts/nexus-eng merge <id>` (integración en rama de sprint, no a main).
12. Actualiza el reporte: `scripts/nexus-eng report --sprint S<nn> --out docs/ingenieria/sprints/S<nn>/reporte.md`.

Paradas obligatorias: pausa, 3 intentos, requisito contradictorio, riesgo de
seguridad, operación destructiva, credencial ausente, push a main, deploy.

Nunca uses `--force`, `--no-verify`, ni mergees a `main`.
