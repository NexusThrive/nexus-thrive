# Decisiones de arquitectura

Cada decisión se registra también como archivo en `docs/ingenieria/adr/`.
Formato: contexto, decisión, consecuencias y alternativas descartadas.

## Resumen

| ADR | Decisión | Estado |
|---|---|---|
| [0001](../adr/0001-nucleo-local-python.md) | Núcleo en Python 3.12 con biblioteca estándar | aceptada |
| [0002](../adr/0002-fuente-unica-de-verdad.md) | Estado y configuración como fuente única de verdad | aceptada |
| [0003](../adr/0003-persistencia-local-primero.md) | Persistencia local versionada, sin PostgreSQL para el estado | aceptada |
| [0004](../adr/0004-adaptadores-generados.md) | OpenCode y Claude Code generados desde un registro canónico | aceptada |
| [0005](../adr/0005-puente-http-n8n.md) | n8n se integra por puente HTTP autenticado e idempotente | aceptada |
| [0006](../adr/0006-integraciones-no-disponibles.md) | Declarar Graphify/NotebookLM como no disponibles en vez de simular | aceptada (Graphify reemplazado por 0009) |
| [0007](../adr/0007-reconstruccion-product-team.md) | Reconstruir el equipo desde el contrato existente | aceptada |
| [0008](../adr/0008-herramientas-externas-adopcion-selectiva.md) | Adopción selectiva de herramientas externas | aceptada |
| [0009](../adr/0009-graphify-vs-codebase-memory.md) | Graphify como grafo estructural; Codebase Memory diferido | aceptada |
| [0010](../adr/0010-dos-equipos-y-loops-compartidos.md) | Dos equipos, un motor y loops por disciplina | aceptada |
| [0011](../adr/0011-rechazo-openhands.md) | Rechazo de OpenHands | aceptada |

## 0001 — Núcleo local en Python

**Contexto:** el equipo debe funcionar desde dos clientes distintos, en CI y en
máquina humana, sin depender de un runtime adicional. El repositorio ya usa
Python en `scripts/product-gate.py`.

**Decisión:** implementar el núcleo con Python 3.12 y biblioteca estándar
(`unittest`, `json`, `fcntl`, `http.server`). Sin dependencias externas
obligatorias.

**Consecuencias:** arranque inmediato, pruebas rápidas, sin instalación de
paquetes; el código no comparte tipos con TypeScript, pero la interfaz es la CLI y
el protocolo HTTP, no imports.

**Alternativas descartadas:** TypeScript (acopla el núcleo a Node y a la versión de
OpenCode); base de datos remota (no hay concurrencia real todavía).

## 0002 — Fuente única de verdad

**Contexto:** el riesgo principal era tener un backlog en cada cliente y perfiles
editados a mano.

**Decisión:** `.product-team/agent-registry.json` es la única definición de
agentes; `.product-team/workflow-policy.json` la única de compuertas y
enrutamiento; `.product-team/state/` el único estado; `skills/` y `commands/` las
únicas fuentes de adaptadores.

**Consecuencias:** los adaptadores se regeneran y se validan; una discrepancia
falla en `nexus-eng validate`. Editar a mano un agente en `.opencode/agents/` se
pierde en la siguiente generación.

## 0003 — Persistencia local primero

**Contexto:** se pidió PostgreSQL solo si existía necesidad real de concurrencia o
trabajo entre máquinas.

**Decisión:** JSON versionado con escritura atómica (`mkstemp` + `os.replace` +
`fsync`), bloqueo `fcntl`, copias de seguridad y auditoría JSONL.

**Consecuencias:** el estado se revisa en un diff, se restaura con Git y no
requiere infraestructura. El límite es un solo repositorio/máquina; si se necesita
concurrencia entre máquinas, se migra el `StateStore` conservando el dominio.

**Alternativas descartadas:** SQLite (bloqueo entre procesos y diff binario);
Postgres (infraestructura sin necesidad medida).

## 0004 — Adaptadores generados

**Contexto:** OpenCode y Claude Code tienen formatos distintos de agentes, skills
y comandos.

**Decisión:** generar ambos desde fuentes canónicas con
`scripts/generate-agents.py` y `scripts/sync-client-adapters.py`. Los skills de
otros plugins no se borran.

**Consecuencias:** 38 agentes en cada cliente, 17 skills canónicas y 7 comandos
sincronizados; validación cruzada en `nexus-eng validate`. El frontmatter difiere
(mode/permissions vs name/tools), el cuerpo es idéntico.

## 0005 — Puente HTTP para n8n

**Contexto:** n8n debe disparar eventos sin convertirse en autoridad ni exponer
administración.

**Decisión:** servidor HTTP con Bearer obligatorio, límite de cuerpo, validación
de contrato, lista blanca de eventos e idempotencia atómica bajo el lock del
estado. El servidor no arranca sin token válido.

**Consecuencias:** integración probada de extremo a extremo con `unittest`;
queda pendiente probarla con n8n real. No hay TLS: requiere proxy o red privada.

## 0006 — Integraciones no disponibles

**Contexto:** Graphify no está instalado y no hay un MCP de NotebookLM mantenido y
autorizado (el repositorio conocido está archivado).

**Decisión:** implementar adaptadores que reporten `unavailable`, conserven el
estado anterior y documenten los pasos de activación. No simular resultados.

**Consecuencias:** el sistema opera sin esas fuentes; la documentación declara el
estado real. Activar cualquiera de las dos requiere autorización humana.

## 0007 — Reconstrucción del Product Team

**Contexto:** se pidió inspeccionar `Product team-0.3.0-v3.zip`; no está en el
workspace, ni en el home, ni en el historial de Git. Solo existía
`.product-team/ci.json` y documentación del contrato.

**Decisión:** registrar el bloqueo y reconstruir el equipo respetando los
conceptos documentados (mesa de trabajo, PO, analista, PM, arquitecto,
desarrolladores, QA, revisor, sprint, HU, ramas, compuertas, 3 intentos, pausa,
reportes, promoción humana).

**Consecuencias:** los perfiles son fieles al contrato, no una copia literal del
plugin original. Si el ZIP aparece, se compara y se ajusta el registro.

## 0008 — Adopción selectiva de herramientas externas

**Contexto:** se pidió evaluar doce herramientas y catálogos antes de instalar,
sin romper la fuente única ni copiar hooks sin revisar.

**Decisión:** cada herramienta vive en `.product-team/skills-registry.json` con
estado (`active`, `installed`, `evaluated`, `deferred`, `rejected`), licencia,
procedencia, permisos, riesgos, prueba y rollback. Se instalaron solo
`find-skills`, `security-audit` y Graphify; ECC, Agency Agents, Archify y Addy
Osmani quedaron evaluados o adaptados, no copiados.

**Consecuencias:** `nexus-eng skills verify` falla si una skill activa pierde su
huella o su revisión. Una skill instalada no se vuelve política por sí sola.

## 0009 — Graphify como grafo estructural

**Contexto:** Graphify y Codebase Memory MCP compiten por el mismo trabajo:
responder preguntas de arquitectura sin leer todo el repositorio.

**Decisión:** Graphify 0.9.95 en venv local `.tools/graphify`, en modo
`--code-only` (AST, sin clave de API). Codebase Memory queda diferido.

**Consecuencias:** `graphify-out/` es artefacto ignorado por Git. El grafo
orienta la lectura; no es evidencia de funcionamiento. Ver ADR 0009 para las
cifras de la prueba real (8100 nodos / 26000 edges en el repositorio completo).

## 0010 — Dos equipos y loops compartidos

**Contexto:** diseño, documentación, marketing y growth necesitaban el mismo
rigor que ingeniería, sin un segundo orquestador.

**Decisión:** una sola máquina de estados con `discipline`, ciclos orientativos
por disciplina, agentes por defecto y revisores independientes por disciplina.
38 perfiles canónicos: 18 de ingeniería y 20 de Studio.

**Consecuencias:** todo trabajo pasa por `review → verified → merged`; el
orquestador rechaza la autoaprobación y `review-plan` declara cuándo falta un
revisor independiente. Publicar, desplegar o gastar sigue exigiendo aprobación
humana.

## 0011 — Rechazo de OpenHands

**Contexto:** se evaluó una plataforma adicional de ejecución de agentes.

**Decisión:** no se adopta: exige uv, Node 24 y Docker opcional, y duplica el
harness sin cubrir una carencia actual.

**Consecuencias:** el trabajo sigue en OpenCode, Claude Code y CI. Se reevalúa
solo si aparece una necesidad real de ejecución aislada de código no confiable.

## 0012 — Agente Steward (propuesta)

**Contexto:** el criterio del dueño sobre capas, historial de git y versionado
solo existía en su cabeza y lo obligaba a validar a mano lo rutinario.

**Decisión:** perfil `steward` que decide solo lo cubierto por
`docs/ingenieria/steward/criterios.md`, cita la cláusula y pregunta cuando no
alcanza. Escribe en `.docs/capas`, ADR y su propio criterio; no implementa
código ni ejecuta nada irreversible o externo.

**Consecuencias:** 39 perfiles (19 de ingeniería, 20 de Studio). Es primer
revisor senior de `documentation` y `research`, excluido si estructuró la
tarea. La restricción por ruta no está garantizada en Claude Code; ver el ADR.

## 0013 — Subagentes nativos en un plugin (propuesta)

**Contexto:** la prueba de punta a punta mostró que el motor Python llevaba contabilidad, que la
independencia de la revisión era nominal y que solapaba con el plugin `product-team`.

**Decisión:** se retira el núcleo y se crea `plugins/product-team` con 43 subagentes, cada uno con
su skill. El archivo del agente es la fuente de verdad; sin registro, generadores, hooks ni n8n.

**Consecuencias:** menos código; se pierde la memoria de tareas, el límite de intentos forzado por
código y OpenCode. Las reglas pasan a las skills y a quien orquesta.
