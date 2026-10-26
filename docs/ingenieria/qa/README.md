# QA

Registro de verificación independiente. Lo escribe `qa-engineer`, nunca quien
implementó el cambio.

## Nomenclatura

`docs/ingenieria/qa/<id-de-tarea>.md`, por ejemplo `HU-CRM-014.md`.

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

## Registro en el núcleo

```bash
scripts/nexus-eng review <id> --kind qa --verdict <veredicto> \
  --reviewer qa-engineer --summary "…" --evidence "…"
```
```

## Reglas

- Sin salida real de la prueba no hay aprobación.
- No se modifican criterios para que pasen.
- Un fallo se reporta con pasos mínimos reproducibles.
- El veredicto se registra en el núcleo: un documento sin registro no cuenta.
- `changes_requested` devuelve la tarea a implementación y consume intento.

## Estado actual

No hay verificaciones registradas: no se ha ejecutado ningún sprint todavía.
