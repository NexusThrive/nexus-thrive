# ADR 0008 — Adopción selectiva de herramientas y skills externas

- **Fecha:** 2026-10-25
- **Estado:** aceptada

## Contexto

Se pidió evaluar doce herramientas, repositorios y catálogos de skills antes de
instalar nada, con función, mantenimiento, licencia, compatibilidad,
dependencias, permisos, riesgos, solapamiento, prueba y rollback. La restricción
principal es que el repositorio ya tiene un núcleo de orquestación, un registro
canónico de agentes y un registro de skills. Instalar un segundo sistema
equivalente rompería la fuente única de verdad.

## Decisión

Ninguna herramienta se instala «porque existe». Cada entrada vive en
`.product-team/skills-registry.json` con estado explícito:

| Estado | Significado |
|---|---|
| `active` | Skill interna, sincronizada a ambos clientes y verificada por huella |
| `installed` | Herramienta o skill externa presente en disco, con revisión y prueba |
| `evaluated` | Analizada; no se instala hasta que exista una necesidad concreta |
| `deferred` | Diferida por bloqueo técnico o comparación pendiente |
| `rejected` | Descartada con motivo escrito |

Casos concretos de esta decisión:

| Herramienta | Estado | Motivo |
|---|---|---|
| `find-skills` (vercel-labs/skills) | instalada | Descubrimiento de capacidades; solo instrucciones, sin scripts |
| `security-audit` (Cloudflare) | instalada | Auditoría defensiva multifase; 19 documentos y un esquema, sin hooks |
| `graphify` 0.9.95 | instalada (modo `--code-only`) | Grafo local sin LLM ni daemon; ver ADR 0009 |
| `playwright` | instalada | Ya era dependencia del repositorio; evidencia real de UI |
| `vercel-skills-cli` | evaluada | Se usa vía `npx`; no se instala globalmente |
| `archify` | evaluada | Clon grande y propuesta visual; Mermaid sigue canónico |
| `addy-osmani-agent-skills` | evaluada | Solapamiento con skills internas; comparar antes de sumar |
| `ECC` | evaluada | Hooks, memoria y reglas ya cubiertos por el núcleo; no se copia masivo |
| `agency-agents` | evaluada | Se adaptaron 20 roles con atribución; no se instala el catálogo |
| `codebase-memory-mcp` | diferida | Duplicaría el grafo de Graphify; instalador descarga binarios |
| `notebooklm-mcp` | rechazada | Repositorio archivado, sin mantenimiento verificable |
| `openhands` | rechazada | Infraestructura desproporcionada; ver ADR 0011 |
| `n8n` | diferida | Sin instancia ni credenciales; workflows validados estáticamente |

Regla de adopción: una skill instalada **no** se convierte en política. Sus
recomendaciones pasan por revisión humana y se adoptan explícitamente.

## Consecuencias

- El registro es la única lista de lo que existe y de lo que no.
- `scripts/nexus-eng skills verify` falla si una skill activa pierde su huella,
  su licencia admitida, su revisión de seguridad o su rollback.
- La instalación es local al repositorio: `.agents/skills/` para el CLI de
  Vercel, `.tools/` para binarios en venv, `.opencode/` y `.claude/` como
  adaptadores.
- Queda trabajo pendiente real: comparar Archify y Addy Osmani con evidencia,
  y decidir si `codebase-memory-mcp` aporta algo que Graphify no dé.

## Alternativas descartadas

- **Instalar todo el catálogo de Agency/ECC:** cientos de perfiles sin
  clasificación, hooks no portables y duplicación de reglas ya implementadas.
- **Aceptar cualquier skill que el CLI marque «Safe»:** el escaneo es una señal,
  no una revisión de permisos ni de procedencia.
- **Instalación global:** dificulta el rollback y mezcla herramientas de varios
  proyectos.
