# ADR — decisiones de ingeniería

Una decisión estructural se registra aquí antes o junto al cambio que la aplica.

## Formato

```markdown
# ADR NNNN — Título

- **Fecha:** YYYY-MM-DD
- **Estado:** propuesta | aceptada | reemplazada por NNNN

## Contexto
Qué problema existe y qué restricciones aplican.

## Decisión
Qué se decide, en términos verificables.

## Consecuencias
Qué mejora, qué empeora, qué queda pendiente.

## Alternativas descartadas
Qué se evaluó y por qué no se eligió.
```

## Índice

| ADR | Título | Estado |
|---|---|---|
| [0001](0001-nucleo-local-python.md) | Núcleo local en Python 3.12 | reemplazada por 0013 |
| [0002](0002-fuente-unica-de-verdad.md) | Fuente única de verdad | aceptada |
| [0003](0003-persistencia-local-primero.md) | Persistencia local primero | reemplazada por 0013 |
| [0004](0004-adaptadores-generados.md) | Adaptadores generados | reemplazada por 0013 |
| [0005](0005-puente-http-n8n.md) | Puente HTTP autenticado para n8n | reemplazada por 0013 |
| [0006](0006-integraciones-no-disponibles.md) | Graphify/NotebookLM no disponibles | aceptada (Graphify reemplazado por 0009) |
| [0007](0007-reconstruccion-product-team.md) | Reconstrucción del Product Team | parcialmente reemplazada por 0013 |
| [0008](0008-herramientas-externas-adopcion-selectiva.md) | Adopción selectiva de herramientas externas | aceptada |
| [0009](0009-graphify-vs-codebase-memory.md) | Graphify como grafo estructural; Codebase Memory diferido | aceptada |
| [0010](0010-dos-equipos-y-loops-compartidos.md) | Dos equipos, un motor y loops por disciplina | aceptada; motor reemplazado por 0013 |
| [0011](0011-rechazo-openhands.md) | Rechazo de OpenHands | aceptada |
| [0012](0012-agente-steward.md) | Agente Steward: criterio del dueño, capas e historial | propuesta |
| [0013](0013-subagentes-nativos-en-plugin.md) | Subagentes nativos en un plugin; se retira el núcleo Python | propuesta |

El resumen narrativo está en
[`../arquitectura/decisions.md`](../arquitectura/decisions.md).

**Regla:** una decisión que cambia un límite entre módulos, un contrato de datos o
una garantía de seguridad exige ADR y revisión humana antes de integrarse.
