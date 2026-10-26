# Diagramas

Diagramas Mermaid que describen **solo lo implementado**. Si una pieza no está
operativa, aparece con línea discontinua y su estado real.

| Archivo | Qué muestra |
|---|---|
| [`system-architecture.mmd`](system-architecture.mmd) | clientes, núcleo, estado canónico, fuentes y producto |
| [`agent-team.mmd`](agent-team.mmd) | 18 perfiles, delegación y revisión independiente |
| [`engineering-loop.mmd`](engineering-loop.mmd) | máquina de estados y requisitos de cada transición |
| [`knowledge-flow.mmd`](knowledge-flow.mmd) | ingesta, deduplicación, adaptadores y uso |
| [`n8n-workflows.mmd`](n8n-workflows.mmd) | workflows A–H, autenticación e idempotencia |
| [`deployment.mmd`](deployment.mmd) | ramas, compuertas, CI y promoción humana |

## Cómo renderizarlos

- GitHub y GitLab renderizan Mermaid en bloques ` ```mermaid `.
- Local: `npx -y @mermaid-js/mermaid-cli -i docs/diagrams/<archivo>.mmd -o /tmp/<archivo>.svg`
  (requiere descargar la herramienta; no está instalada en este entorno).
- VS Code / OpenCode: extensión de previsualización de Mermaid.

## Regla de honestidad

Un diagrama no es evidencia de ejecución. La evidencia está en:

- `packages/nexus-engineering-core/tests/` (54 pruebas);
- `scripts/nexus-eng validate` y `health`;
- el informe de sprint en `docs/ingenieria/sprints/`;
- los logs de CI cuando se ejecute el push.

Las piezas marcadas como no instaladas (n8n, Graphify, NotebookLM) no deben
presentarse como operativas en ningún diagrama ni documento.
