# ADR 0002 — Fuente única de verdad

- **Fecha:** 2026-10-25
- **Estado:** aceptada

## Contexto

Dos clientes con perfiles propios, dos backlogs y dos políticas producen deriva:
una tarea avanza en OpenCode y Claude Code no lo sabe, o un agente se edita a mano
en un cliente y se pierde.

## Decisión

| Concepto | Fuente única |
|---|---|
| Agentes (18) | `.product-team/agent-registry.json` |
| Compuertas, enrutamiento, límites | `.product-team/workflow-policy.json` |
| Estado de tareas, sprints, checkpoints | `.product-team/state/` |
| Skills | `skills/<id>/SKILL.md` |
| Comandos | `commands/<id>.md` |
| Conocimiento | `docs/knowledge/` + `state/knowledge/catalog.json` |

Los adaptadores (`.opencode/`, `.claude/`) se generan. `scripts/nexus-eng
validate` comprueba que los 18 agentes existen en ambos clientes, que hay al menos
8 skills y 7 comandos, y que los workflow no contienen secretos.

## Consecuencias

- Un cambio de agente se hace en el registro y se regenera.
- Editar a mano un adaptador se pierde en la siguiente generación.
- La validación falla de forma explícita si falta un artefacto.

## Alternativas descartadas

- **Mantener ambos clientes a mano:** deriva inevitable.
- **Un solo cliente:** se pidió compatibilidad con ambos.
