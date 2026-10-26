---
name: release-management
description: Prepara versiones y PR de promoción a main con evidencias, notas y rollback, sin publicar ni saltarse protecciones.
metadata:
  opencode/autoinvoke: true
---

# Gestión de release

## Requisitos antes de promover

- Todas las historias del sprint en `merged` o justificadas.
- CI verde en la rama de sprint, con evidencia enlazada.
- QA y revisión senior registrados; sin bloqueos abiertos.
- Notas de versión y rollback escritos.
- Aprobación humana explícita.

## Preparación

1. `scripts/nexus-eng report --sprint S<nn> --out docs/ingenieria/sprints/S<nn>/reporte.md`.
2. Verifica `git status`, rama y diff `sprint/S<nn>...main`.
3. Crea el PR **sin mergear**:
   `gh pr create --base main --head sprint/S<nn> --title "..." --body-file <notas>`
   Si `gh` no está autenticado, deja el comando preparado y documenta el bloqueo.
4. Adjunta: resumen, evidencias de CI, riesgos aceptados, rollback.
5. Solicita revisión humana.

## Prohibiciones

- No hacer merge a `main`.
- No desplegar a producción.
- No desactivar protecciones de rama.
- No usar `--force` ni `--no-verify`.
- No declarar el release publicado si el PR sigue abierto.

## Después del merge humano

Verificar despliegue con evidencia real; si no hay acceso, registrar
"pendiente de verificación" en vez de asumir éxito.
