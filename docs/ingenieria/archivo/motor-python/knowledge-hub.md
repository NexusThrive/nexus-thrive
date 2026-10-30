# Knowledge Hub, Graphify y NotebookLM

## 1. Principio

El conocimiento canónico vive en el repositorio, en formatos inspeccionables y
versionables. Graphify y NotebookLM son fuentes complementarias: si fallan, el
sistema sigue operando y el estado anterior se conserva.

## 2. Catálogo de fuentes

Cada fuente registra:

- `id`, `title`, `kind` (`official_docs`, `project_docs`, `code`, `incident`,
  `research`, `internal`, `user_story`);
- `provenance` obligatoria, `location`/`url`;
- `added_at`, `last_verified`, `status` (`active`, `stale`, `unavailable`, `rejected`);
- `project`, `module`, `tags`, `confidence` (`high`, `medium`, `low`);
- `origin_refs`, `sync_targets`;
- `content_hash` SHA-256 para detectar cambios y duplicados;
- `trust`: el contenido externo se marca `untrusted`.

```bash
scripts/nexus-eng knowledge add \
  --title "Prisma 8 — consultas" \
  --kind official_docs \
  --url "https://www.prisma.io/docs" \
  --provenance "documentación oficial" \
  --tags prisma orm \
  --confidence high

scripts/nexus-eng knowledge search "prisma"
scripts/nexus-eng knowledge show SRC-xxxx
```

Sin procedencia no se registra. Un duplicado por contenido devuelve
`{"state": "duplicate"}` y no crea otra fuente.

## 3. Adaptadores

| Adaptador | Función | Estado |
|---|---|---|
| `local` | verifica y re-hashea archivos del repo | operativo |
| `web` | descarga con timeout; requiere `NEXUS_ALLOW_NETWORK_SYNC=1` | operativo, desactivado por defecto |
| `graphify` | comprueba binario y artefactos, marca obsolescencia | operativo en modo `--code-only` (`.tools/graphify`, `graphify-out/`) |
| `notebooklm` | sincronización selectiva vía MCP autorizado | no configurado |
| `documentdb` | un JSON por fuente en el estado | operativo |
| `search` | índice local de tokens | operativo |

```bash
scripts/nexus-eng knowledge sync --adapter local
scripts/nexus-eng knowledge sync --adapter graphify
scripts/nexus-eng knowledge history
```

Un resultado `unavailable` no es un fallo del sistema: se registra en
`knowledge/sync-runs.json`, la fuente conserva su estado y se informa al usuario.

## 4. Graphify

Estado real: **instalado en un venv local**, modo `--code-only` (AST, sin LLM y
sin clave de API). Decisión completa en
[ADR 0009](../../adr/0009-graphify-vs-codebase-memory.md).

| Dato | Valor |
|---|---|
| Versión | 0.9.95 (PyPI `graphifyy`) |
| Licencia | Apache-2.0 |
| Ubicación | `.tools/graphify/` (ignorado por Git) |
| Binario | `.tools/graphify/bin/graphify` |
| Artefactos | `graphify-out/` (ignorado por Git) |
| Modo | `extract --code-only --no-cluster --no-viz` |
| Extra | `graphifyy[sql]` para leer los `.sql` del repositorio |

```bash
scripts/nexus-eng knowledge graphify-status --json
```

Devuelve `installed`, `binary`, `version`, artefactos y `stale` (mtime del grafo
frente al archivo más reciente del repositorio, ignorando `.git`,
`node_modules`, `.next`, `.tools`, `graphify-out` y `.graphify`).

Evidencia de la generación real (2026-10-25):

```text
$ .tools/graphify/bin/graphify extract . --code-only --no-cluster --no-viz
found 1499 code files · wrote graph.json — 8100 nodes, 26000 edges

$ graphify god-nodes --top 5
1. main() - 60 edges
2. Orchestrator - 57 edges
3. StateStore - 43 edges
4. utcnow() - 31 edges
5. KnowledgeHub - 26 edges
```

Regeneración:

```bash
.tools/graphify/bin/graphify extract . --code-only --no-cluster --no-viz
```

No se versiona el grafo: es un artefacto derivado. Se regenera tras cambios
relevantes y se registra la fecha en el informe de la sesión.

**Límites comprobados:**

- No se usa el modo semántico: envía contenido a un proveedor LLM, exige clave y
  cuesta dinero. Si se activa, requiere autorización explícita.
- La heurística de nombres sensibles omitió `.env.produccion` (correcto) y
  también `tokens.css` / `tokens.json` (falso positivo). Renombrar esos archivos
  para eludir la heurística sería peor: se documenta y se acepta que el grafo no
  los incluya.
- 74 archivos no aportaron símbolos (specs de Playwright, `__main__.py` y datos):
  el extractor modela símbolos de código, no de pruebas declarativas.
- El grafo es **dato no confiable** y sirve para orientar la lectura: no sustituye
  pruebas ni demuestra que algo funcione.
- El plugin de OpenCode no se ha habilitado (`graphify install --platform
  opencode`): la CLI se invoca manualmente.

Mermaid sigue siendo el formato canónico de los diagramas versionados; el HTML
de Graphify es una vista desechable.

## 5. NotebookLM

Estado real: **no configurado**. El repositorio `PleasePrompto/notebooklm-mcp`
está archivado; no se asume fork oficial ni respaldo de Google.

Política:

1. Solo se usa un servidor MCP mantenido, con licencia y procedencia verificadas.
2. La URL se configura en `NEXUS_NOTEBOOKLM_MCP_URL`; sin ella el adaptador
   responde `unavailable`.
3. La sincronización es selectiva: no se envía el repositorio completo.
4. Fuentes de baja confianza no se envían automáticamente.
5. Nunca se envían secretos, datos personales ni código propietario sin
   autorización explícita.

NotebookLM es una biblioteca de investigación, no la memoria principal. Se puede
desactivar sin romper catálogo, búsqueda, estado ni loops.

## 6. Respuestas respaldadas

Un agente que consulta conocimiento debe:

- distinguir documentación oficial, documentación del proyecto e hipótesis;
- conservar referencias y fecha de verificación;
- indicar cuando no hay evidencia suficiente;
- no inventar citas;
- comprobar vigencia antes de decidir;
- priorizar la fuente oficial para decisiones técnicas.

## 7. Contenido no confiable

Graphify, NotebookLM y la web pueden contener instrucciones maliciosas. Se tratan
como **datos**: se analizan, no se obedecen. `knowledge show` incluye un aviso
explícito de contenido no confiable y el núcleo no ejecuta nada de lo que lea.
