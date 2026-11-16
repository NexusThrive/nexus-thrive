# QA

Registro de verificación independiente. Lo escribe `qa-engineer`, nunca quien
implementó el cambio.

## Nomenclatura

`docs/07-ingenieria/qa/<id-de-tarea>.md`, por ejemplo `HU-CRM-014.md`.

## Plantilla

```markdown
# QA — <id> · <título>

- **Fecha:** YYYY-MM-DD
- **Implementado por:** <agente>
- **Verificado por:** qa-engineer
- **Rama / commit:** …
- **Veredicto:** approved | changes_requested | blocked

## Criterios de aceptación

| Criterio | Prueba ejecutada | Resultado | Evidencia |
|---|---|---|---|
| … | `pnpm test …` | pasa/falla | salida o archivo |

## Casos no felices

| Caso | Resultado |
|---|---|
| entrada inválida | … |
| sin permiso | … |
| error de red/servicio | … |

## Regresiones

…

## Riesgo residual

…

## Registro de evidencia

La verificación se registra manualmente en el reporte y el PR, con comandos y resultados reales. El motor nexus-eng está retirado.
```

## Reglas

- Sin salida real de la prueba no hay aprobación.
- No se modifican criterios para que pasen.
- Un fallo se reporta con pasos mínimos reproducibles.
- El veredicto queda enlazado desde el reporte de sprint y el PR con su evidencia.
- `changes_requested` devuelve la tarea a implementación y consume intento.

## Estado actual

Esta carpeta conserva el procedimiento; los reportes se crean solo cuando exista una verificación real. La falta de reportes aquí no permite deducir el estado de otros sprints.
