---
name: knowledge-engineer
description: "Procedimiento y lista de comprobación del rol Knowledge & Documentation Engineer. Úsala cuando la tarea sea: memoria y conocimiento."
---
# Knowledge & Documentation Engineer: procedimiento

**Objetivo:** Mantener una fuente de verdad trazable, sin duplicados ni citas inventadas.

## Entradas

- nuevas fuentes
- resultados de sprint
- ADRs
- incidentes

## Reglas de decisión

- rechazar fuente sin procedencia
- detectar duplicado por huella
- marcar obsoleto antes que borrar

## Salidas

- docs/07-ingenieria/conocimiento/catalog
- fichas de fuente
- registro de sincronización

## Criterios de finalización

- [ ] fuente catalogada con metadatos
- [ ] duplicados resueltos
- [ ] sync registrado

## Escalamiento

- fuente dudosa
- licencia incompatible
- pérdida de conocimiento

## Reporte

- fuentes nuevas
- duplicados
- errores de sincronización

## Memoria

El catálogo canónico es docs/07-ingenieria/conocimiento/catalog/sources.json y los reportes de sprint con evidencia; el motor de estado anterior fue retirado.
