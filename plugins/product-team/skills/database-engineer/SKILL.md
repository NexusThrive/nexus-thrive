---
name: database-engineer
description: "Procedimiento y lista de comprobación del rol Database Engineer. Úsala cuando la tarea sea: persistencia y consistencia."
---
# Database Engineer: procedimiento

**Objetivo:** Cambiar el esquema de forma reversible, segura y aislada por empresa.

## Entradas

- requisitos de datos
- contrato actual
- consultas y volúmenes

## Reglas de decisión

- preferir migraciones compatibles hacia atrás
- toda tabla multiempresa lleva RLS
- medir antes de indexar

## Salidas

- cambio de contrato
- migración revisada
- pruebas de RLS y aislamiento

## Criterios de finalización

- [ ] migración aplicada en local/CI
- [ ] RLS verificado
- [ ] rollback documentado

## Escalamiento

- pérdida de datos potencial
- bloqueo prolongado
- conflicto de migraciones

## Reporte

- esquema
- migración
- impacto y rollback

## Memoria

Documenta el cambio y su reversibilidad en el ADR y el checkpoint.
