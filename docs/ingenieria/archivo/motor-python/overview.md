# Arquitectura — NEXUS Engineering Intelligence Platform

> Estado: implementado y probado en local. Las integraciones externas que no
> pudieron verificarse se marcan explícitamente como tales.

## 1. Qué existe

El repositorio tenía un contrato de Product Team (`docs/product/README.md`,
`.product-team/ci.json`, `scripts/product-gate.py`) pero **no** el ZIP
`Product team-0.3.0-v3.zip` ni su carpeta extraída. Se buscó en el workspace y en
el home del usuario; el bloqueo quedó registrado y el equipo se reconstruyó a
partir del contrato documentado, conservando sus conceptos:

- mesa de trabajo, product owner, analista, project manager, arquitecto,
  desarrollador, control de calidad y revisor;
- ciclo de sprint, HU con criterios de aceptación, backlog por dependencias,
  ramas de trabajo y de sprint, compuertas, CI, QA y revisión independientes,
  límite de tres intentos, archivo de pausa, reportes y promoción humana a `main`.

## 2. Principios aplicados

1. **Una sola fuente de verdad**: `.product-team/state/` (JSON versionado) y
   `docs/` canónicos. OpenCode y Claude Code son adaptadores generados, no
   sistemas paralelos.
2. **Núcleo independiente del cliente**: Python 3.12 con biblioteca estándar,
   invocable por CLI y por HTTP. No requiere Node, base de datos ni servicios.
3. **Persistencia local primero**: no hay PostgreSQL para el estado porque no
   existe todavía concurrencia entre máquinas ni consultas estructuradas que lo
   justifiquen. La migración queda documentada en `decisions.md`.
4. **Autonomía controlada**: los agentes avanzan solos dentro del alcance, pero se
   detienen ante pausa, tres intentos, riesgo de seguridad, requisito
   contradictorio, credencial ausente o acción externa.
5. **Evidencia o no está hecho**: no hay transición a `review`, `verified` o
   `merged` sin compuerta, QA, revisión senior y CI registrados.

## 3. Componentes

```text
├── packages/nexus-engineering-core/     núcleo Python (dominio, estado, loops)
│   ├── src/nexus_engineering/
│   │   ├── domain.py          tareas, estados, transiciones, hallazgos
│   │   ├── store.py           JSON atómico, bloqueo, auditoría JSONL
│   │   ├── policy.py          compuertas, enrutamiento, límites
│   │   ├── orchestrator.py    cola, intentos, checkpoints, recuperación
│   │   ├── knowledge.py       Knowledge Hub y adaptadores
│   │   ├── workflows.py       idempotencia de automatizaciones
│   │   ├── server.py          puente HTTP autenticado para n8n
│   │   ├── gitguard.py        reglas de ramas y comandos peligrosos
│   │   ├── security.py        redacción de secretos y validación
│   │   └── health.py          salud y validación estructural
│   └── tests/                 86 pruebas unittest
├── .product-team/             registro de agentes, política, esquemas y estado
├── .opencode/                 agentes, comandos y skills (OpenCode)
├── .claude/                   agentes, comandos, skills y settings de ejemplo
├── skills/ commands/          fuentes canónicas sincronizadas a ambos clientes
├── integrations/n8n/          workflows A–K, esquemas y guía
├── scripts/                   generadores, guardas y wrapper `nexus-eng`
└── docs/                      producto, ingeniería, conocimiento y diagramas
```

## 4. Flujo de una tarea

```text
objetivo → HU → tarea en el núcleo → agente asignado → implementación + pruebas
→ compuerta local → QA independiente → revisión senior → CI verde → merge a sprint
→ reporte → siguiente tarea
```

Cada etapa deja un registro en `.product-team/state/`:

| Archivo | Contenido |
|---|---|
| `tasks.json` | tareas, estado, intentos, dependencias, verificaciones y veredictos |
| `sprints.json` | sprints y su rama |
| `checkpoints/<id>.json` | objetivo, rama, commit base, hashes de archivos, próxima acción |
| `runs.jsonl` | ejecuciones por agente/cliente |
| `audit/events.jsonl` | eventos de auditoría redactados |
| `knowledge/catalog.json` | fuentes con procedencia y huella |
| `knowledge/sync-runs.json` | resultados de sincronización |
| `workflows/executions.json` | ejecuciones de n8n con clave de idempotencia |
| `decisions.json` | decisiones registradas |

## 5. Estado real de cada pieza

| Pieza | Estado | Evidencia |
|---|---|---|
| Máquina de estados y transiciones | Operativa | `tests/test_domain.py` |
| Cola, dependencias, intentos, pausa, recuperación | Operativa | `tests/test_orchestrator.py` |
| CLI compartida | Operativa | `tests/test_cli.py` |
| Puente HTTP autenticado e idempotente | Operativo y probado | `tests/test_server.py` |
| Knowledge Hub + adaptadores local/documentdb/search | Operativo | `tests/test_knowledge.py` |
| Graphify | Instalado en `.tools/graphify` (0.9.95, modo `--code-only`); grafo en `graphify-out/` | `knowledge graphify-status` |
| NotebookLM MCP | **No configurado**; adaptador declara `unavailable` | `knowledge sync` |
| Workflows n8n | JSON versionados y validados; **no importados** (n8n ausente) | `integrations/n8n/` |
| Agentes OpenCode/Claude Code | Generados desde el registro (38: 18 ingeniería + 20 Studio, en cada cliente) | `scripts/generate-agents.py` |
| Skills y comandos | 17 skills canónicas y 7 comandos sincronizados a ambos clientes; 30 entradas en el registro | `scripts/sync-client-adapters.py` |
| Aplicación (tipos, lint, unitarias) | Verificada localmente: `tsc` limpio, 0 errores de lint, 1318 pruebas OK | `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test` |
| Storybook y accesibilidad | Compila con 513 entradas; `a11y.spec.ts` sin violaciones | `pnpm build-storybook`, `playwright e2e/a11y.spec.ts` |
| End-to-end de producto | 29 specs sobre flujos reales, ejecutados en escritorio y móvil | `playwright test` |
| CI | Paso Python añadido; **ejecución remota pendiente de push** | `.github/workflows/ci.yml` |

## 6. Herramientas verificadas en el entorno

`opencode 2.1.4`, `claude 2.1.308`, `node v24.22.1`, `pnpm 12.3.4`,
`python 3.12.3`, `git 2.43.0`, `gh 2.45.0`, `docker 29.9.2` y
`graphify 0.9.95` en `.tools/graphify` (no está en `PATH`; `health` lo resuelve
por ruta local y lo reporta como disponible). No hay `n8n`, `notebooklm` ni
`pytest`; las pruebas del núcleo usan `unittest`.

## 7. Límites conocidos

- El ZIP original del Product Team no estaba disponible: los perfiles son una
  reconstrucción fiel al contrato, no una copia literal.
- n8n no se ha importado ni ejecutado; solo se validó la estructura JSON.
- Graphify está operativo solo en modo `--code-only`; el grafo es dato no
  confiable y no sustituye pruebas. NotebookLM sigue sin adaptador operativo.
- No se ha creado ningún PR ni se ha desplegado nada.
- La verificación de la app completa (typecheck, lint, tests) se ejecuta en este
  repositorio y se reporta en el informe final; el CI remoto aún no se ejecutó.
