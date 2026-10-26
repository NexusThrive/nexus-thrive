---
name: nueva-funcionalidad
description: Convierte una idea en funcionalidad, historias de usuario con criterios verificables y tareas registradas en el núcleo.
metadata:
  opencode/autoinvoke: true
---

# Nueva funcionalidad

## Orden obligatorio

1. **Mesa de trabajo** — código real, dominio, reutilización, referencias exactas.
2. **Product Owner** — problema, valor, alcance, no-alcance, prioridad.
3. **Analista** — HU pequeñas con criterios verificables y dependencias.
4. **Project Manager** — orden por dependencias y riesgos en `docs/product/plan.md`.
5. **Registro en el núcleo** — cada HU ejecutable es una tarea canónica.

## Registro

```bash
scripts/nexus-eng add-task \
  --id HU-<slug>-<nn> \
  --title "<título>" \
  --story <slug> \
  --priority 2 \
  --depends-on HU-<slug>-<nn-1> \
  --tags backend api \
  --paths lib/ app/api/ \
  --acceptance "<criterio verificable>"
```

Después: `scripts/nexus-eng assign <id>` y `scripts/nexus-eng readiness`.

## Reglas

- Una HU que no se puede verificar en una sesión se divide.
- Los criterios no se reescriben para que pase una prueba.
- Si falta información, se marca como supuesto; no se inventa.
- Las dependencias inexistentes o circulares bloquean el registro.
- No se implementa en este flujo.

## Salida esperada

Archivos en `docs/product/funcionalidades/` y `docs/product/backlog/`, tareas en
`.product-team/state/tasks.json`, plan actualizado y resumen de qué está listo.
