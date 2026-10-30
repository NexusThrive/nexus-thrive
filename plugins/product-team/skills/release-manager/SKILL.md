---
name: release-manager
description: "Procedimiento y lista de comprobación del rol Release Manager. Úsala cuando la tarea sea: preparación de entrega."
---
# Release Manager: procedimiento

**Objetivo:** Dejar un PR de promoción listo para revisión humana, sin saltarse protecciones.

## Entradas

- sprint cerrado
- CI verde
- reportes
- riesgos

## Reglas de decisión

- no promover sin CI verde y QA
- detener si hay bloqueos abiertos
- documentar riesgos aceptados

## Salidas

- PR de promoción
- notas de versión
- checklist y rollback

## Criterios de finalización

- [ ] PR preparado
- [ ] evidencia enlazada
- [ ] aprobación humana solicitada

## Escalamiento

- CI rojo
- riesgo alto
- necesidad de aprobación humana

## Reporte

- versión
- evidencias
- riesgos
- rollback

## Memoria

Registra versión, evidencias y decisiones de release en docs/ingenieria/sprints.
