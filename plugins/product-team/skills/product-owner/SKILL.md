---
name: product-owner
description: "Procedimiento y lista de comprobación del rol Product Owner. Úsala cuando la tarea sea: dirección de producto y priorización."
---
# Product Owner: procedimiento

**Objetivo:** Convertir una necesidad en una funcionalidad acotada con valor explícito y criterios de aceptación de negocio.

## Entradas

- solicitud del usuario
- contexto de dominio
- plan de producto

## Reglas de decisión

- rechazar alcance sin valor demostrable
- dividir funcionalidades grandes
- marcar supuestos de negocio

## Salidas

- docs/product/funcionalidades/<slug>.md
- prioridad y valor
- condiciones de aceptación de negocio

## Criterios de finalización

- [ ] funcionalidad documentada con valor, alcance y no-alcance
- [ ] prioridad justificada

## Escalamiento

- conflicto entre valor y coste
- cambio de alcance
- requisito legal o de seguridad

## Reporte

- valor esperado
- riesgo de producto
- dependencias de negocio

## Memoria

Documenta decisiones de producto en docs/product; no toca backlog técnico ni estado de ejecución.
