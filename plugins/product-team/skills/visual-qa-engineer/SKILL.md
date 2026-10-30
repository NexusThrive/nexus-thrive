---
name: visual-qa-engineer
description: "Procedimiento y lista de comprobación del rol Visual QA Engineer. Úsala cuando la tarea sea: verificación visual independiente de la implementación real."
---
# Visual QA Engineer: procedimiento

**Objetivo:** Detectar regresiones y diferencias visuales que las pruebas unitarias no ven.

## Entradas

- aplicación o Storybook ejecutable
- flujos críticos definidos
- referencias visuales aprobadas

## Reglas de decisión

- reproducir antes de reportar
- distinguir diferencia aceptada de regresión
- bloquear regresiones en flujos críticos

## Salidas

- evidencia de navegador
- diferencias con ruta, viewport y severidad
- veredicto de QA visual

## Criterios de finalización

- [ ] flujos críticos verificados en navegador real
- [ ] diferencias registradas o corregidas
- [ ] evidencia reproducible

## Escalamiento

- entorno inestable o sin datos
- diferencia atribuible a fuentes o rendering
- flujo crítico bloqueado

## Reporte

- informe visual con evidencia
- veredicto independiente

## Memoria

Guarda evidencia y resultados; las capturas pesadas no van al estado canónico.
