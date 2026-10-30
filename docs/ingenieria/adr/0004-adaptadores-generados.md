# ADR 0004 — Adaptadores generados desde fuentes canónicas

- **Fecha:** 2026-10-25
- **Estado:** reemplazada por 0013

## Contexto

OpenCode y Claude Code usan formatos distintos:

- OpenCode: `mode`, `permissions`, comandos en `.opencode/commands/`.
- Claude Code: `name`, `tools`, `PreToolUse` hooks, comandos en
  `.claude/commands/`.

Mantener 18 perfiles duplicados en cada cliente garantiza que se desincronicen.

## Decisión

Generar los artefactos desde el registro y las fuentes canónicas:

```bash
python3 scripts/generate-agents.py       # 18 + 18 agentes
python3 scripts/sync-client-adapters.py  # skills y comandos
python3 scripts/build-n8n-workflows.py   # workflows y esquemas
```

El cuerpo de cada agente es idéntico; solo cambia el frontmatter. La
sincronización de skills **no borra** skills de otros plugins (Prisma se conserva).

## Consecuencias

- Los clientes ven el mismo contenido y el mismo estado.
- Añadir un agente requiere: registro + regenerar + validar.
- `validate` detecta agentes faltantes en cualquiera de los dos clientes.
- Los hooks de Claude Code son una barrera adicional, no la única: el núcleo
  rechaza igualmente las operaciones peligrosas.

## Alternativas descartadas

- **Symlinks:** OpenCode y Claude Code no interpretan igual el frontmatter.
- **Duplicación manual:** ya probó ser frágil en otros repositorios.
