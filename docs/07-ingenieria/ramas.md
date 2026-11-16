# Ramas

## Propósito y alcance

Relacionar cada cambio del monolito con una historia y un PR revisable.

Las ramas de tarea siguen `<tipo>/HU-<slug>-<nn>`, en inglés, con `feature`, `fix`, `chore` o `hotfix`, un slug en minúsculas y dos dígitos. Ejemplo: `chore/HU-documentation-consolidation-01`. El prefijo de rama es distinto del tipo de commit.

Las ramas de integración siguen `sprint/S<nn>` cuando existe un sprint confirmado. Las tareas parten de su base acordada y sus PR apuntan a esa base. La promoción del sprint requiere aprobación humana. Nunca hacer push directo a main o sprint/*, merge automático a main, ni usar --force o --no-verify.

El [plan](../01-producto/plan.md) y el [reporte de sprint](sprints/README.md) registran HU, rama, PR y verificación. La limpieza documental no importa autorizaciones de integración del repositorio kernel.
