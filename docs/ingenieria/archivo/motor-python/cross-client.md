# Compatibilidad OpenCode ↔ Claude Code

## 1. Regla base

El estado, la política y el conocimiento son **compartidos**. Los clientes solo
aportan interfaz y ejecución del modelo. Ningún cliente guarda estado propio que
el otro necesite.

```text
                    ┌─────────────────────────────┐
                    │  .product-team/state/       │
                    │  tasks, checkpoints,        │
                    │  knowledge, workflows       │
                    └──────────┬──────────────────┘
                               │  lectura/escritura
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
             OpenCode      Claude Code    CLI / n8n
             (agentes)      (agentes)     (humano / HTTP)
```

El cliente solo cambia el campo `origin` (`opencode`, `claude-code`, `n8n`, `cli`)
y `client` en los checkpoints. Todo lo demás es idéntico.

## 2. Fuentes canónicas y artefactos generados

| Concepto | Fuente única | OpenCode | Claude Code |
|---|---|---|---|
| Agentes | `.product-team/agent-registry.json` | `.opencode/agents/*.md` | `.claude/agents/*.md` |
| Política | `.product-team/workflow-policy.json` | leída por la CLI | leída por la CLI |
| Skills | `skills/<id>/SKILL.md` | `.opencode/skills/` | `.claude/skills/` |
| Comandos | `commands/<id>.md` | `.opencode/commands/` | `.claude/commands/` |
| Estado | `.product-team/state/` | misma ruta | misma ruta |
| Conocimiento | `docs/knowledge/` + estado | misma ruta | misma ruta |

Regeneración:

```bash
pnpm engineering:generate
# equivale a:
# python3 scripts/generate-agents.py
# python3 scripts/sync-client-adapters.py
# python3 scripts/build-n8n-workflows.py
```

`sync-client-adapters.py` **no borra** skills de otros plugins (por ejemplo los de
Prisma): solo reemplaza las carpetas de los skills canónicos.

## 3. Diferencias reales entre clientes

| Aspecto | OpenCode | Claude Code |
|---|---|---|
| Configuración | `opencode.json`, `.opencode/` | `.claude/settings.json` (ejemplo incluido) |
| Permisos de agente | `permissions` en el frontmatter | `tools` permitidos en el frontmatter |
| Hook de Git | guardas en el núcleo + instrucciones | `PreToolUse` → `scripts/guard_git.py` |
| Subagentes | `mode: subagent` | agentes por archivo |

Los hooks de Claude Code son una barrera adicional; la barrera real es el núcleo,
que rechaza las operaciones peligrosas sin importar el cliente.

## 4. Continuidad entre clientes

Escenario verificado por pruebas (`tests/test_cli.py::test_recuperacion_por_cli`):

1. En OpenCode: `start`, trabajo, `checkpoint --client opencode`.
2. Se cierra la sesión.
3. En Claude Code: `recover <id> --client claude-code`.
4. Resultado `resumable` → continuar desde `next_action`.
5. Resultado `drift` → detenerse y pedir decisión humana.

El checkpoint contiene rama, commit base, hashes SHA-256 de archivos, pruebas,
fallos, intentos, dependencias y próxima acción. No contiene transcripciones ni
secretos, por lo que es seguro versionarlo.

## 5. Condiciones para que el traspaso sea válido

- El árbol de trabajo está limpio o los cambios están commiteados.
- La rama actual coincide con la del checkpoint.
- El commit base del checkpoint es ancestro de `HEAD`.
- Los archivos registrados conservan su hash.
- Las dependencias de la tarea siguen `merged`.

Si algo no se cumple, la tarea no se reanuda automáticamente.

## 6. Qué no se duplica

- No hay un backlog por cliente: hay uno en el estado canónico.
- No hay perfiles de agente editados a mano en un cliente.
- No hay "memoria del chat" como fuente de verdad.
- No hay dos implementaciones del loop: la lógica vive en
  `packages/nexus-engineering-core/`.
