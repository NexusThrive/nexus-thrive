# ADR 0013 — Subagentes nativos en un plugin; se retira el núcleo Python

- **Fecha:** 2026-10-30
- **Estado:** propuesta (la acepta una persona; ver «Regla» en el índice)

## Contexto

El PR #115 construyó un núcleo en Python (`nexus-eng`, ~4.500 líneas, 92 pruebas) que
llevaba tareas, estados y compuertas, y generaba los adaptadores de agentes para Claude Code
y OpenCode desde un registro JSON. Al probarlo de punta a punta con una tarea real
(`HU-steward-prueba-capas-01`) se vio que:

- El trabajo lo hacían los subagentes y los comandos; el motor llevaba la contabilidad.
- La independencia de la revisión era **nominal**: el motor solo comparaba el nombre del
  revisor que se le pasaba, sin comprobar que otro agente hubiera revisado.
- Aparecieron defectos propios: la política de ramas rechazaba `feature/…`, el CLI mostraba
  trazas en vez de errores, y una tarea de solo documentación exigía el `test` completo.
- Solapaba con el plugin `product-team` ya existente (arquitecto, QA, revisor de PR, ciclo de sprint).
- Las 11 automatizaciones de n8n dependían del puente HTTP del motor y nunca se ejecutaron.

El dueño decidió usar subagentes de Claude directamente, cada uno con su skill, y que el
plugin `product-team` los agrupe de forma ordenada.

## Decisión

1. **Se retira** `packages/nexus-engineering-core`, `scripts/nexus-eng`, los generadores y
   `scripts/product-gate.py`, el registro y la política JSON, el estado en `.product-team/state`,
   los adaptadores de OpenCode y los generados de `.claude/`, y `integrations/n8n`.
   No queda ningún archivo `.py` versionado en el repositorio.
2. **Nace `plugins/product-team`** (instalable con `.claude-plugin/marketplace.json`) con:
   - **43 subagentes** en `agents/<id>.md`: los 39 perfiles (19 de ingeniería, 20 de Studio y el
     Steward del ADR 0012) más 4 heredados que invoca `ciclo-sprint` por nombre
     (`desarrollador-junior`, `desarrollador-frontend`, `control-calidad`, `revisor-pr`).
   - **Una skill por rol** en `skills/<id>/SKILL.md` (entradas, reglas de decisión, salidas,
     lista de cierre, escalamiento), más las skills de flujo y temáticas.
   - Cada agente declara solo las herramientas que necesita: se quitó `Bash` a 16 roles, el revisor de marca
     (`brand-consistency-reviewer`) pasó a solo lectura (`senior-reviewer` ya lo era) y se quitó `Task` al
     `engineering-manager` (un subagente no puede lanzar otros; orquesta la sesión principal).
3. **El archivo del agente es la fuente de verdad.** Ya no hay registro ni generador.
4. **Independencia real:** el veredicto de QA o de revisión lo emite otro subagente, invocado
   por quien orquesta. No existe un libro de registro que lo certifique.
5. **Sin hooks.** Las reglas de ramas se aplican por instrucción, por el job `branch-name` del
   CI y por la protección de ramas de GitHub. Los hooks de Python del plugin subido a claude.ai
   no se copian.
6. Se conservan: `.product-team/ci.json` (tres comandos que lee `ciclo-sprint`), el criterio del
   Steward (`docs/ingenieria/steward/criterios.md`) y el registro de herramientas externas
   (`docs/ingenieria/herramientas/registro.json`, evidencia del ADR 0008).
7. La documentación del motor pasa a `docs/ingenieria/archivo/motor-python/` como historia.

## Consecuencias

- Menos código que mantener (se eliminan unas 42.600 líneas entre núcleo, adaptadores generados, n8n y documentación del motor, y el plugin añade unas 4.700, casi todo Markdown)
  y una sola forma de definir agentes, que Claude Code entiende de forma nativa.
- **Se pierde** la memoria de tareas entre sesiones y clientes, el límite de 3 intentos y la pausa
  forzados por código, y la exclusión automática del implementador como revisor. Pasan a ser
  reglas escritas en las skills y a cumplirlas quien orquesta; el estado vive en git, PR e informes.
- **Se pierde OpenCode.** Si se vuelve a necesitar, habrá que generar sus adaptadores desde estos
  archivos (el diseño anterior está en git).
- Los 20 agentes de Studio siguen siendo genéricos y hay solape entre los 4 heredados y
  `backend-engineer`, `frontend-engineer`, `qa-engineer` y `senior-reviewer`. Unificarlos queda pendiente.
- Son 55 skills; si el contexto se satura, se agruparán por familia.
- Si el plugin subido a claude.ai sigue instalado con el mismo nombre habrá que desactivarlo.
- n8n (A–K) se quita sin haberse ejecutado. Sigue en el historial de git; se rehará con una
  instancia real y un caso concreto.

## Alternativas descartadas

- **Conservar el motor y añadir subagentes encima:** mantiene el coste de código sin resolver que
  la independencia sea nominal.
- **Reducir el motor a un libro de registro:** sigue siendo código propio para algo que git y los
  PR ya registran, salvo que se use OpenCode a la vez; no es el caso.
- **Editar la copia sincronizada del plugin de claude.ai:** se sobrescribe al sincronizar y no
  queda versionada.
- **Meter los hooks de Python en el plugin nuevo:** contradice el objetivo de no depender de Python.
