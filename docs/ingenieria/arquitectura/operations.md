# Operación

## 1. Requisitos

| Herramienta | Versión verificada | Uso |
|---|---|---|
| Python | 3.12.3 | núcleo, CLI, pruebas |
| Git | 2.43.0 | ramas, checkpoints, guardas |
| Node | v24.22.1 | producto Next.js |
| pnpm | 12.3.4 | compuertas del producto |
| OpenCode | 2.1.4 | cliente de agentes |
| Claude Code | 2.1.308 | cliente de agentes |

El núcleo no necesita dependencias de Python externas (`unittest` de la stdlib).
`jsonschema` es opcional: si está, `validate` comprueba estructura; si no, lo
declara como advertencia y sigue.

## 2. Arranque

```bash
pnpm install
pnpm engineering:generate     # agentes, skills, comandos, workflows n8n
pnpm engineering:validate     # estado + configuración
scripts/nexus-eng status
```

## 3. Comandos habituales

| Objetivo | Comando |
|---|---|
| Inicializar estado | `scripts/nexus-eng init` |
| Ver estado | `scripts/nexus-eng status --json` |
| Siguiente tarea | `scripts/nexus-eng next` |
| Clasificar cola | `scripts/nexus-eng readiness` |
| Registrar HU | `scripts/nexus-eng add-task --id HU-… --title "…"` |
| Asignar especialista | `scripts/nexus-eng assign <id>` |
| Iniciar intento | `scripts/nexus-eng start <id> --branch feat/HU-…` |
| Compuertas reales | `scripts/nexus-eng verify <id> --gate required` |
| Pedir revisión | `scripts/nexus-eng request-review <id>` |
| Registrar veredicto | `scripts/nexus-eng review <id> --kind qa --verdict approved --reviewer qa-engineer` |
| CI verde | `scripts/nexus-eng ci-green <id> --evidence <url>` |
| Integrar en sprint | `scripts/nexus-eng merge <id>` |
| Registrar sprint | `scripts/nexus-eng sprint-add S01 --goal "…"` |
| Cerrar sprint | `scripts/nexus-eng sprint-close S01` (exige todas las tareas integradas o canceladas) |
| Checkpoint | `scripts/nexus-eng checkpoint <id> --agent … --files …` |
| Reanudar | `scripts/nexus-eng recover <id> --client opencode` |
| Pausar / reanudar | `scripts/nexus-eng pause` / `unpause` |
| Reporte | `scripts/nexus-eng report --sprint S01 --out …` |
| Conocimiento | `scripts/nexus-eng knowledge …` |
| Puente n8n | `NEXUS_WEBHOOK_TOKEN=… scripts/nexus-eng serve` |

`--json` funciona antes o después del subcomando.

## 4. Comprobaciones

```bash
pnpm engineering:test                 # 86 pruebas del núcleo
pnpm engineering:validate             # estado + configuración
pnpm exec tsc --noEmit                # tipos del producto
pnpm lint                             # eslint
pnpm test                             # vitest
bash ./scripts/product-gate.py        # compuerta heredada (.product-team/ci.json)
```

`pnpm test:integration` requiere `TEST_DATABASE_URL`.
`pnpm test:e2e` construye Storybook y ejecuta Playwright.

## 5. Salud

```bash
scripts/nexus-eng health --json
```

Informa:

- rama y si está protegida; árbol sucio y número de archivos;
- pausa activa y ruta del archivo;
- presencia real de `opencode`, `claude`, `node`, `pnpm`, `python3`, `git`, `gh`,
  `n8n`, `graphify`, `docker`;
- estado de Graphify (`installed`, `version`, `stale`);
- número de fuentes de conocimiento;
- workflows n8n versionados y si n8n está instalado;
- validación estructural del estado.

`ok` es `false` si el repositorio está en `main`/`master` o si el estado es
incoherente. Las herramientas ausentes se reportan, no se simulan.

## 6. Pausa

`docs/ingenieria/PAUSA` es el freno operativo. Mientras exista:

- no se eligen tareas nuevas;
- `start` falla con `PolicyError`;
- el trabajo en curso puede cerrar y guardar checkpoint;
- el archivo no se elimina solo.

## 7. Reanudación tras caída o cambio de cliente

1. `scripts/nexus-eng recover <id> --client <cliente>`.
2. `resumable` → continuar desde `next_action`.
3. `drift` → no continuar; revisar rama, commit y hashes.
4. `no_checkpoint` → reconstruir desde Git y pruebas, y crear checkpoint antes de
   seguir.

## 8. Copias y recuperación del estado

- Cada escritura de JSON deja una copia en `.product-team/state/backups/`.
- `audit/events.jsonl` y `runs.jsonl` son append-only.
- El estado es texto versionable: un `git checkout` del directorio restaura un
  punto conocido.
- No hay base de datos remota que pueda quedar inconsistente con el repositorio.

## 9. Problemas frecuentes

| Síntoma | Causa probable | Acción |
|---|---|---|
| `Estado bloqueado por otro proceso` | otro proceso tiene el lock | esperar o revisar procesos |
| `Transición no permitida` | se intentó saltar una etapa | seguir el flujo canónico |
| `compuerta local no está aprobada` | falta `verify` | ejecutar compuertas reales |
| `Revisión no independiente` | el implementador emitió el veredicto | asignar otro agente |
| `límite de 3 intentos alcanzado` | tres fallos | decisión humana, corregir causa raíz |
| `El árbol de trabajo está sucio` | cambios sin commit | commit o stash |
| `NotebookLM no configurado` | falta MCP autorizado | registrar y seguir sin él |
| `Graphify no está instalado` | binario ausente de `.tools/graphify` y del `PATH` | revisar la ruta o usar grep |

## 10. Verificación ejecutada en este entorno

Resultados reales del 2026-10-26, sin push ni PR:

| Compuerta | Comando | Resultado |
|---|---|---|
| Núcleo | `pnpm engineering:test` | 86 pruebas, `OK` |
| Configuración | `pnpm engineering:validate` | `ok: true`, sin problemas |
| Tipos | `pnpm exec tsc --noEmit` | sin errores |
| Lint | `pnpm lint` | 0 errores, 31 avisos preexistentes |
| Producto (unitarias) | `pnpm test` | 92 archivos OK, 58 omitidos; 1318 pruebas OK, 336 omitidas |
| End-to-end | `pnpm exec playwright test` | 378 pruebas en 29 specs y 2 proyectos: 347 OK, 31 omitidas, 0 fallos |
| Accesibilidad | `playwright e2e/a11y.spec.ts` | 52 OK (temas claro/oscuro, escritorio y móvil, sin violaciones axe) |
| Storybook | `pnpm build-storybook` | compila; 513 entradas en `index.json` |
| Generadores | `generate-agents`, `sync-client-adapters`, `build-n8n-workflows` | 38 agentes, 34 skills y 14 comandos sincronizados, 11 workflows con esquema |
| Salud | `scripts/nexus-eng health --json` | `ok: true`, rama no protegida, árbol sucio |

Las pruebas omitidas son de integración/entorno y no se declaran como ejecutadas.

## 11. Demostración de extremo a extremo

Se ejecutó el ciclo completo contra un directorio de estado temporal
(`--state-dir /tmp/...`) para no contaminar el estado canónico:

```text
sprint-add S01
add-task HU-DEMO-001 (backend)
assign → start (rama feat/HU-DEMO-001)
verify --gate required  → lint, typecheck y test reales OK
request-review → QA aprobado (qa-engineer) → revisión senior aprobada
ci-green → merge → report
```

Resultado: la tarea llegó a `merged` con 1 intento, evidencia de las tres
compuertas y dos veredictos de agentes distintos del implementador. El reporte se
generó sin errores.

Esa prueba detectó un hueco real: el sprint no registraba sus tareas ni salía de
`planned`. Se corrigió con `_link_task_to_sprint`, `_activate_sprint` y
`sprint-close` (este último exige que todas las tareas estén integradas o
canceladas), cubierto por tres pruebas nuevas (la suite tiene hoy 86 pruebas).

El estado canónico sigue vacío: **no se ha ejecutado un sprint real del producto**.

## 12. Qué no está verificado en este entorno

- Ejecución remota del CI (los cambios están sin push).
- Importación y ejecución de workflows en n8n.
- Graphify operativo solo en modo `--code-only`; NotebookLM sin adaptador.
- El grafo de Graphify es un artefacto: no se versiona ni se usa como evidencia de
  funcionamiento.
- Creación de PR con `gh` (no se ejecutó para no publicar cambios).
- Despliegue a producción.
