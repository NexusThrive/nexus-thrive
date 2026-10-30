# ADR 0006 — Declarar Graphify y NotebookLM como no disponibles

- **Fecha:** 2026-10-25
- **Estado:** aceptada; parte de Graphify reemplazada por [0009](0009-graphify-vs-codebase-memory.md)

## Contexto

- Graphify no está instalado en el entorno.
- El repositorio `PleasePrompto/notebooklm-mcp` está archivado; no hay un servidor
  MCP mantenido, con licencia verificada y autorizado.
- Se pidió explícitamente no afirmar que una integración está instalada o probada
  si no lo está.

## Decisión

> Actualización 2026-10-25: Graphify sí quedó instalado en modo `--code-only`
> (ADR 0009). Lo que sigue vigente es la regla de estado honesto y el caso de
> NotebookLM, que continúa sin adaptador operativo.

Implementar adaptadores con estado honesto:

- `graphify`: detecta binario (`NEXUS_GRAPHIFY_BIN` o `which graphify`), artefactos
  en `.graphify/` y calcula `stale` comparando mtimes. Si falta, devuelve
  `unavailable`.
- `notebooklm`: exige `NEXUS_NOTEBOOKLM_MCP_URL` o `NEXUS_NOTEBOOKLM_ENABLED=1`.
  Sin configuración devuelve `unavailable` con el motivo. No hay integración
  simulada.
- En ambos casos, la fuente conserva su estado anterior y el fallo queda en
  `knowledge/sync-runs.json`.

## Consecuencias

- El sistema opera sin esas fuentes; catálogo, búsqueda y documentos locales son
  la base.
- Activar cualquiera requiere autorización humana, versión fijada y procedencia
  verificada.
- La documentación (`knowledge-hub.md`, `integrations/n8n/README.md`, `health`)
  refleja el estado real.

## Alternativas descartadas

- **Simular resultados del grafo:** viola la regla de evidencia.
- **Fork no auditado de NotebookLM MCP:** riesgo de seguridad y de licencia.
