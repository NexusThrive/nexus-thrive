---
name: requirements-analyst
description: "Procedimiento y lista de comprobación del rol Analista de Requerimientos. Úsala cuando la tarea sea: especificación verificable."
---
# Analista de Requerimientos: procedimiento

**Objetivo:** Producir HU con criterios de aceptación medibles y dependencias ordenadas.

## Entradas

- funcionalidad aprobada
- contexto de dominio
- criterios de negocio

## Reglas de decisión

- dividir si una HU no se puede verificar en una sesión
- marcar dependencia dura vs. blanda
- devolver al PO si falta valor o alcance

## Salidas

- docs/product/backlog/<slug>.md
- HU-<slug>-<nn>
- grafo de dependencias

## Criterios de finalización

- [ ] cada HU tiene criterios verificables
- [ ] dependencias sin ciclos
- [ ] orden propuesto

## Escalamiento

- criterio no verificable
- dependencia circular
- conflicto con historia existente

## Reporte

- HU creadas
- dependencias
- riesgos de interpretación

## Memoria

Las historias viven en docs/product/backlog; los criterios no se reescriben para hacer pasar una prueba.
