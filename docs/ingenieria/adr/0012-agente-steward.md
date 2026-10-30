# ADR 0012 — Agente Steward: criterio del dueño, capas e historial

- **Fecha:** 2026-10-30
- **Estado:** propuesta (la acepta una persona; ver «Regla» en el índice)

## Contexto

El dueño valida a mano decisiones rutinarias que dependen de un criterio que
solo vive en su cabeza: cómo se ordenan las capas, cuándo un cambio es PATCH o
MINOR, qué PR es demasiado grande, qué contradice una decisión anterior. Los
38 perfiles existentes cubren ejecución y revisión técnica, pero ninguno
sostiene la **continuidad** entre capas, historial de git, versionado y
decisiones.

Restricciones que ya existen y no se tocan:

- Una sola máquina de estados; nadie aprueba su propio trabajo (ADR 0010).
- Una decisión que cambia un límite exige ADR y revisión humana (índice de ADR).
- Publicar, desplegar, gastar o prometer exige aprobación humana.
- `main` solo recibe PR; no se usa `--force` ni `--no-verify` (política de git).

## Decisión

Se añade el agente **`steward`** al plugin `product-team` (ADR 0013):
`plugins/product-team/agents/steward.md` y su skill `plugins/product-team/skills/steward/SKILL.md`.
Es de ingeniería, categoría `direccion`.

### 1. Su criterio está escrito, no inferido

La fuente es `docs/ingenieria/steward/criterios.md`. El Steward decide solo lo
que una cláusula de ese archivo cubre y **cita la cláusula** en cada veredicto.
Si el caso no está cubierto, no improvisa: formula la pregunta al dueño y la
respuesta se añade al archivo. El «pensar como el dueño» crece por escritura,
no por suposición.

### 2. Niveles de autoridad

| Nivel | Qué puede hacer | Ejemplos |
|---|---|---|
| **Autónomo** | Actuar y registrar | Estructurar `.docs/capas` y sus índices, mantener `capas-estado-*` con evidencia, proponer partición de PR, proponer versión, redactar ADR `propuesta` |
| **Veredicto** | Registrar revisión con cláusula | Conformidad con `criterios.md`; senior review de tareas de `documentation` y `research` |
| **Humano obligatorio** | Preparar y detenerse | Aceptar un ADR, merge a `main`, tags y releases, despliegue, reescritura de historial, publicar, gastar, cambiar alcance |

### 3. Qué ve y qué toca

- **Lee:** `.docs/capas`, `.docs/capas-estado-*`, `.docs/hoja-de-ruta-*`,
  `docs/nexus-architecture`, ADR, `docs/VERSIONADO.md`, historial de git y el
  grafo local de Graphify (dato no confiable: orienta, no prueba).
- **Escribe solo en:** `.docs/capas/**`, `.docs/capas-estado-*.md`,
  `docs/ingenieria/adr/**` y `docs/ingenieria/steward/**`.
- **No implementa** código de producción.

### 4. Independencia

- Si el Steward estructura una capa, **no revisa esa misma tarea**: la revisa otro subagente
  (`senior-reviewer` o `knowledge-engineer`), lanzado por quien orquesta.
- Puede actuar como revisor senior de tareas de documentación e investigación que no estructuró.
  En ingeniería, diseño, marketing y growth no sustituye a los revisores propios de cada una.
- La etiqueta `adr` sigue siendo de `arquitecto`.

### 5. Relación con `arquitecto`

`arquitecto` diseña **cómo se implementa una historia** en el código. El
Steward cuida **qué capas existen, en qué orden y por qué**, y que las
decisiones y el historial sean coherentes entre sí. No se pisan: uno produce
notas de diseño por historia, el otro mantiene la estructura que las enmarca.

## Consecuencias

- El dueño deja de validar lo que `criterios.md` cubre y sigue validando lo
  irreversible, lo externo y el alcance.
- Aparece un archivo nuevo que mantener (`criterios.md`). Si se queda vacío, el
  Steward solo hará preguntas: el valor depende de que el dueño lo alimente.
- **Límite conocido de aplicación.** Un agente de Claude Code se restringe por herramienta, no por
  ruta: el Steward tiene `Edit` y `Write` en todo el repo, y su limitación a `.docs/capas/**`,
  `.docs/capas-estado-*.md`, `docs/ingenieria/adr/**` y `docs/ingenieria/steward/**` descansa en su
  contrato y en la revisión independiente, no en un permiso.
- Un solo modelo que escribe y valida arriesga sesgo compartido. Por eso el
  Steward no aprueba lo que estructura y toda aprobación irreversible sigue
  siendo humana.

## Alternativas descartadas

- **Guardar el criterio en la memoria del agente:** invisible en un diff, no
  versionado y distinto por cliente. Rompe la fuente única (ADR 0002).
- **Un Steward con permiso de merge:** convierte un acierto estadístico en
  autoridad sobre producción; contradice la política de ramas protegidas.
- **Ampliar `arquitecto`:** mezcla diseño por historia con gobierno de capas y
  deja sin dueño la continuidad entre decisiones.
- **Esperar a NotebookLM para crearlo:** el Steward funciona sin él con los
  archivos del repo. NotebookLM se decidirá en un ADR aparte, tras verificar
  que existe una vía de integración mantenida.
