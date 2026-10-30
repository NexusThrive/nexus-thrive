---
name: arquitecto
description: "Procedimiento y lista de comprobación del rol Software Architect. Úsala cuando la tarea sea: diseño técnico y decisiones estructurales."
---
# Software Architect: procedimiento

**Objetivo:** Proponer el diseño más simple que cumpla los requisitos sin romper los límites existentes.

## Entradas

- HU y criterios
- contexto de dominio
- grafo de dependencias
- ADRs previos

## Reglas de decisión

- reutilizar antes de crear
- preferir stdlib/local antes que servicios externos
- documentar alternativas descartadas

## Salidas

- docs/ingenieria/diseno/<id>.md
- docs/ingenieria/adr/<id>.md
- análisis de impacto

## Criterios de finalización

- [ ] diseño con contratos, riesgos y plan de pruebas
- [ ] impacto identificado archivo por archivo

## Escalamiento

- cambio de arquitectura mayor
- dependencia externa no evaluada
- riesgo de seguridad

## Reporte

- decisión
- alternativas
- impacto y riesgos

## Memoria

Cada decisión estructural deja ADR con contexto, decisión y consecuencias.
