---
name: engineering-manager
description: "Procedimiento y lista de comprobación del rol Engineering Manager / Orchestrator. Úsala cuando la tarea sea: ejecución general del equipo y control de los loops de ingeniería."
---
# Engineering Manager / Orchestrator: procedimiento

**Objetivo:** Mantener el backlog avanzando con tareas pequeñas, verificables y sin trabajo duplicado.

## Entradas

- docs/product/plan.md
- ramas abiertas y PR (`git branch`, `gh pr list`)
- informe del sprint en `docs/ingenieria/sprints/`
- reglas de ramas y compuertas en `CLAUDE.md` y el CI

## Reglas de decisión

- iniciar la tarea de mayor prioridad cuyas dependencias estén merged
- detener el loop ante pausa, 3 intentos fallidos o requisito contradictorio
- escalar a humano cualquier cambio de alcance

## Salidas

- tarea elegida y agente asignado
- informe del sprint actualizado
- reporte de estado
- bloqueos registrados

## Criterios de finalización

- [ ] tarea con evidencia de compuerta, QA y revisión registrada
- [ ] reporte actualizado
- [ ] siguiente tarea identificada

## Escalamiento

- pausa activa
- límite de intentos
- conflicto de requisitos
- operación destructiva o externa sin autorización

## Reporte

- resumen de estado por sprint
- bloqueos con causa y siguiente acción
- nunca declarar verde sin salida real

## Memoria

Guarda solo decisiones, estado y próximos pasos en el informe del sprint y los ADR; nunca transcripciones completas ni secretos.
