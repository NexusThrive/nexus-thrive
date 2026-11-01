# ADR 0007 — Reconstrucción del Product Team

- **Fecha:** 2026-10-25
- **Estado:** parcialmente reemplazada por 0013

## Contexto

El primer paso obligatorio era localizar e inspeccionar
`Product team-0.3.0-v3.zip` o su carpeta extraída. Se buscó:

- en el workspace actual y directorios hermanos;
- en el home del usuario;
- en el historial de Git del repositorio.

No se encontró el ZIP ni una carpeta equivalente. Lo que sí existía:

- `.product-team/ci.json` con la configuración de la compuerta;
- `docs/product/README.md` describiendo roles y rutas;
- `scripts/product-gate.py` usado por la compuerta;
- referencias en `AGENTS.md`, `CLAUDE.md` y documentación de producto.

## Decisión

1. Registrar el bloqueo de forma explícita (no fingir que se inspeccionó).
2. Reconstruir el equipo a partir del contrato documentado, conservando:
   mesa de trabajo, product owner, analista, project manager, arquitecto,
   desarrollador, control de calidad y revisor; ciclo de sprint, HU con criterios
   de aceptación, backlog por dependencias, ramas de trabajo y de sprint,
   compuertas, CI, QA y revisión independientes, límite de 3 intentos, pausa,
   reportes y promoción humana a `main`.
3. Ampliar a 18 perfiles especializados para el stack real del repositorio
   (frontend, backend, datos, integraciones, DevOps, seguridad, conocimiento,
   investigación, release).
4. Mantener `scripts/product-gate.py` y `.product-team/ci.json` como compuerta
   heredada, sin romperlos.

## Consecuencias

- Los perfiles son fieles al contrato, no una copia literal del plugin original.
- Si el ZIP aparece, se compara con `.product-team/agent-registry.json` y se
  ajusta lo que falte; el resto del sistema no cambia.
- La compuerta heredada sigue disponible junto a la nueva
  (`.product-team/workflow-policy.json`).

## Alternativas descartadas

- **Inventar que el ZIP se inspeccionó:** inaceptable.
- **Bloquear todo el trabajo:** se pidió continuar con el trabajo independiente.
- **Ignorar el contrato existente:** habría roto la compatibilidad documentada.
