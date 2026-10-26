# Sprints

Un directorio por sprint: `docs/ingenieria/sprints/S<nn>/`.

## Contenido esperado

```text
S<nn>/
├── plan.md        objetivo, historias, dependencias, riesgos, criterio de cierre
├── reporte.md     generado con `nexus-eng report --sprint S<nn>`
└── notas.md       decisiones, incidentes y desviaciones (opcional)
```

## Reglas

- No se inicia un sprint con dependencias sin resolver.
- El sprint tiene un objetivo verificable y un criterio de cierre explícito.
- Las ramas de trabajo salen de `sprint/S<nn>`: `<tipo>/HU-<slug>-<nn>`.
- Los PR de tarea apuntan a `sprint/S<nn>`, nunca a `main`.
- La promoción `sprint/S<nn>` → `main` es un PR con aprobación humana; no la hace
  ningún agente.
- Un sprint no se cierra con tareas `blocked` sin justificar.

## Generar el reporte

```bash
scripts/nexus-eng report --sprint S01 --out docs/ingenieria/sprints/S01/reporte.md
```

El reporte incluye estado por tarea, intentos, rama, dependencias, bloqueos,
verificaciones y veredictos. Se genera desde el estado canónico, no se escribe a
mano.

## Ciclo del sprint

1. `sprint-add S01 --goal "…"` → estado `planned`.
2. Al iniciar la primera tarea del sprint → estado `active` y la tarea queda
   registrada en `sprint.tasks`.
3. Cada tarea recorre compuertas, QA, revisión senior, CI y `merge`.
4. `sprint-close S01` → solo si todas las tareas están `merged` o `cancelled`;
   deja `closed_at` y registra el evento.
5. La promoción de `sprint/S01` a `main` es un PR con aprobación humana, fuera del
   núcleo.

## Estado actual

No hay sprints registrados en `.product-team/state/sprints.json` ni directorios de
sprint: la plataforma está lista para el primero, no ha ejecutado ninguno todavía.
