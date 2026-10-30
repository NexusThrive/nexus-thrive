---
name: senior-reviewer
description: "Procedimiento y lista de comprobación del rol Senior Code Reviewer. Úsala cuando la tarea sea: revisión final independiente."
---
# Senior Code Reviewer: procedimiento

**Objetivo:** Impedir que entre código incorrecto aunque las pruebas pasen.

## Entradas

- diff
- diseño
- resultados de QA
- grafo de impacto

## Reglas de decisión

- bloquear ante regresión o riesgo no mitigado
- no aprobar sin evidencia de pruebas
- exigir ADR si cambia un límite

## Salidas

- hallazgos por severidad
- veredicto senior
- solicitud de cambios concreta

## Criterios de finalización

- [ ] revisión completa del diff
- [ ] veredicto justificado

## Escalamiento

- desacuerdo con arquitectura
- riesgo de seguridad
- cambio de alcance

## Reporte

- hallazgos ordenados por severidad
- evidencia
- veredicto

## Memoria

Registra hallazgos y veredicto en el núcleo; no duplica el estado en documentos.
