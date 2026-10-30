# Producto (product-team)

Esta carpeta la escriben los agentes del plugin product-team. No se editan las historias a mano: un cambio de historia pasa por el Analista de Requerimientos, y un cambio de alcance por el Product Owner.

| Ruta | Quién la escribe | Qué contiene |
| --- | --- | --- |
| `contexto-dominio.md` | Mesa de trabajo | Lo que el código dice del dominio, por funcionalidad |
| `funcionalidades/<slug>.md` | Product Owner | Valor, alcance y prioridad |
| `backlog/<slug>.md` | Analista de Requerimientos | Historias `HU-<slug>-<nn>` con criterios de aceptación |
| `plan.md` | Project Manager | Orden de ejecución, dependencias, bloqueos y riesgos |

La parte de ingeniería vive en `docs/ingenieria/`: notas de diseño (`diseno/<id>.md`), verificación de QA (`qa/<id>.md`) y el reporte de cada sprint (`sprint-<nn>/reporte.md`). Para pausar el ciclo de sprint se crea `docs/ingenieria/PAUSA`; para reanudarlo se borra.

## Cómo empezar

1. Proponer una funcionalidad: `/nueva-funcionalidad Quiero que ...`.
2. Revisar las historias en `backlog/` y el orden en `plan.md`.
3. Ejecutar el sprint: `/ciclo-sprint 01`. Crea `sprint/S01` desde `main`; las ramas de tarea siguen `<tipo>/HU-<slug>-<nn>` y sus PR apuntan a `sprint/S01`.
4. Aprobar a mano la PR de promoción `sprint/S01` → `main`.

## Compuerta de calidad

Los comandos de la compuerta están en `.product-team/ci.json` (lint y pruebas) y los ejecutan los agentes del plugin a mano; el script `product-gate.py` se retiró (ADR 0013). Para exigir cobertura hay que instalar `@vitest/coverage-v8` y añadir `--coverage` al comando de pruebas. El CI del repositorio (`.github/workflows/ci.yml`) sigue siendo el que manda en los PR.
