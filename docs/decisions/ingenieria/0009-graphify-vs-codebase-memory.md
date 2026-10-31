# ADR 0009 — Graphify como grafo estructural; Codebase Memory diferido

- **Fecha:** 2026-10-25
- **Estado:** aceptada

## Contexto

El equipo necesita responder preguntas de arquitectura («qué depende de qué»,
«qué se rompe si cambio esto») sin leer el repositorio completo. Había dos
candidatos:

- **Graphify** (`Graphify-Labs/graphify`, Apache-2.0): extracción AST local,
  grafo consultable, `query`/`path`/`explain`/`god-nodes`, salida HTML.
- **Codebase Memory MCP** (`DeusData/codebase-memory-mcp`, MIT): servidor MCP
  persistente con índice propio, lente de código y selección de pruebas por
  cambio.

Ambos mantienen un índice estructural. Sostener los dos duplica instalación,
almacenamiento, actualización y superficie de seguridad.

## Decisión

Se adopta **Graphify en modo `--code-only`**, instalado en un venv local
`.tools/graphify`, y se difiere Codebase Memory MCP.

Evidencia de la prueba real (25 archivos del núcleo, sin clave de API):

```text
$ .tools/graphify/bin/graphify extract packages/nexus-engineering-core \
    --code-only --no-cluster --no-viz --out /tmp/graphify-run
found 25 code, 0 docs, 0 papers, 0 images
wrote graph.json — 412 nodes, 1140 edges

$ graphify god-nodes --top 5
1. main() - 60 edges
2. Orchestrator - 57 edges
3. StateStore - 43 edges
4. utcnow() - 31 edges
5. KnowledgeHub - 26 edges
```

El modo semántico (que envía contenido a un proveedor LLM) **no** se usa por
defecto: exige clave, cuesta dinero y convierte código del repositorio en dato
enviado a terceros.

## Consecuencias

- `graphify-out/` está en `.gitignore`: el grafo es artefacto, no fuente.
- El Knowledge Hub detecta el binario en `.tools/graphify/bin/graphify` y lee
  `graphify-out/` (con `.graphify/` como compatibilidad heredada).
- El grafo es **dato no confiable**: sirve para orientar la lectura, nunca para
  afirmar que algo funciona. Las pruebas siguen siendo la evidencia.
- Mermaid sigue siendo el formato canónico de diagramas versionados; el HTML de
  Graphify es una vista, no documentación.
- Criterio de reevaluación de Codebase Memory: si aparecen necesidades que el
  AST local no cubre (selección de pruebas por cambio, consultas MCP desde el
  agente) y su instalador pasa revisión de seguridad.

## Alternativas descartadas

- **Instalar ambos:** dos índices que se contradicen y nadie sabe cuál es
  canónico.
- **Solo Codebase Memory:** su instalador descarga binarios y mantiene un
  servidor; mayor superficie antes de demostrar ventaja.
- **Grafo semántico completo:** coste, dependencia de red y envío de código a un
  tercero sin necesidad demostrada.
- **No tener grafo:** obliga a leer el repositorio completo en cada pregunta de
  arquitectura.
