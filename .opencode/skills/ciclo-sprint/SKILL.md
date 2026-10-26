---
name: ciclo-sprint
description: Ejecuta el ciclo completo de un sprint con loops verificables, checkpoints, límite de 3 intentos, pausa y revisión independiente.
metadata:
  opencode/autoinvoke: true
---

# Ciclo de sprint

## Máquina de estados

`pending → ready → in_progress → review → verified → merged`

- `blocked` y `failed` permiten volver a `ready` con motivo.
- No existe ningún camino directo de `in_progress` a `merged`.
- `review` exige compuerta local aprobada.
- `verified` exige QA independiente **y** revisión senior aprobadas.
- `merged` exige CI verde registrado.

## Procedimiento

1. `scripts/nexus-eng next --json`. Si `paused` o `empty`, detente.
2. Comprueba `git status --porcelain`: árbol sucio = parada.
3. Crea rama `<tipo>/<HU-id>` desde `sprint/S<nn>` y arranca:
   `scripts/nexus-eng start <id> --branch <rama>`.
4. Implementa con pruebas. Guarda checkpoint con archivos y resultados.
5. `scripts/nexus-eng verify <id> --gate required` (lint, typecheck, test reales).
6. `scripts/nexus-eng request-review <id>`.
7. QA registra veredicto; senior reviewer registra el suyo. Nunca el implementador.
8. Cambios solicitados → corregir y repetir. Máximo 3 intentos por historia.
9. CI verde → `ci-green` → `merge` (solo rama de sprint).
10. Reporte: `report --sprint S<nn> --out docs/ingenieria/sprints/S<nn>/reporte.md`.

## Paradas obligatorias

- `docs/ingenieria/PAUSA` existe.
- 3 intentos agotados.
- Requisito contradictorio, riesgo de seguridad, operación destructiva.
- Falta credencial externa o autorización humana.
- Cualquier tentación de usar `--force`, `--no-verify`, push a `main`/`sprint/*`.

## Evidencia mínima para declarar terminado

Comando ejecutado + salida real + tarea en el estado canónico + veredictos
registrados. Una afirmación sin salida no es evidencia.
