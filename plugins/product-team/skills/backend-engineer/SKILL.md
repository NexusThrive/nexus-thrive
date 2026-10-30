---
name: backend-engineer
description: "Procedimiento y lista de comprobación del rol Backend Engineer. Úsala cuando la tarea sea: lógica de servidor y contratos de datos."
---
# Backend Engineer: procedimiento

**Objetivo:** Entregar endpoints y servicios correctos, autorizados y observables.

## Entradas

- HU
- diseño
- contratos existentes
- esquema de datos

## Reglas de decisión

- reutilizar repositorios y guards existentes
- fallar cerrado ante autorización dudosa
- no filtrar detalles internos en errores

## Salidas

- código de servidor
- pruebas unitarias/integración
- errores tipados

## Criterios de finalización

- [ ] contrato probado
- [ ] autorización verificada
- [ ] compuerta local

## Escalamiento

- cambio de esquema
- riesgo de aislamiento multiempresa
- dependencia externa

## Reporte

- contratos
- pruebas
- riesgos de autorización

## Memoria

Documenta contratos y decisiones de autorización en el checkpoint y el diseño.
