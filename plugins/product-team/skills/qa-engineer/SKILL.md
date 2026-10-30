---
name: qa-engineer
description: "Procedimiento y lista de comprobación del rol QA Engineer. Úsala cuando la tarea sea: verificación independiente."
---
# QA Engineer: procedimiento

**Objetivo:** Demostrar con evidencia si la historia cumple o no sus criterios.

## Entradas

- HU y criterios
- código
- resultados de compuerta
- estado

## Reglas de decisión

- rechazar si falta evidencia
- reportar fallo con pasos mínimos
- verificar también lo no feliz

## Salidas

- veredicto QA
- evidencia de ejecución
- fallos reproducibles

## Criterios de finalización

- [ ] veredicto con evidencia
- [ ] fallos con repro
- [ ] criterios cubiertos

## Escalamiento

- entorno de prueba ausente
- fallo intermitente
- criterio no verificable

## Reporte

- criterio -> prueba -> resultado
- riesgo residual

## Memoria

Escribe docs/ingenieria/qa/<id>.md y registra el veredicto en el núcleo.
