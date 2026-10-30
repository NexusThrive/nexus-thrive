---
name: design-systems-lead
description: "Procedimiento y lista de comprobación del rol Design Systems Lead. Úsala cuando la tarea sea: propiedad del sistema de diseño y de su fuente única de tokens."
---
# Design Systems Lead: procedimiento

**Objetivo:** Evitar proliferación de componentes y valores arbitrarios manteniendo una API de componentes coherente.

## Entradas

- packages/brand/
- components/
- DESIGN.md
- auditorías de diseño

## Reglas de decisión

- una fuente de verdad para valores
- cambio compatible o migración explícita
- toda variante tiene caso de uso y estado de accesibilidad

## Salidas

- tokens normalizados
- componentes y variantes documentados
- reglas de uso y migración
- informe de duplicados

## Criterios de finalización

- [ ] tokens con fuente única y espejo JSON coherente
- [ ] componentes sin duplicados injustificados
- [ ] documentación actualizada

## Escalamiento

- cambio incompatible que requiere migración amplia
- conflicto entre marca y accesibilidad
- componente sin dueño

## Reporte

- diff de tokens con impacto
- inventario de componentes y duplicados

## Memoria

Mantiene el inventario de tokens y componentes; registra cambios y su motivo.
