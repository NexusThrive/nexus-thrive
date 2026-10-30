# ADR 0010 — Dos equipos, un motor y loops por disciplina

- **Fecha:** 2026-10-25
- **Estado:** aceptada; el motor y los estados quedan reemplazados por 0013

## Contexto

El equipo de ingeniería ya tenía máquina de estados, compuertas, checkpoints,
límite de tres intentos, pausa y revisión independiente. Diseño, documentación,
marketing y growth no tenían ciclo propio: sus tareas se trataban como
ingeniería o quedaban fuera del estado canónico.

Se pidió ampliar el trabajo sin crear un segundo orquestador ni duplicar el
backlog.

## Decisión

Se conserva **un solo motor** (`packages/nexus-engineering-core`) y se agregan
dos dimensiones:

1. **Disciplina de la tarea** (`Task.discipline`): `engineering`, `design`,
   `documentation`, `marketing`, `growth`, `research`.
2. **Ciclo orientativo por disciplina** (`LOOP_STAGES`), que describe en qué
   etapa está el trabajo y qué evidencia falta. **No** son estados: el estado
   sigue siendo el de `TRANSITIONS`, con `review`, `verified` y `merged`
   obligatorios.

```text
pending → ready → in_progress → review → verified → merged
                     ↑            │
                     └── changes_requested (QA o revisión senior)

Cualquier estado no terminal → blocked → (decisión humana) → ready
Máximo 3 intentos → blocked + decisión humana
docs/ingenieria/PAUSA → no se inicia trabajo nuevo
```

Cada disciplina define:

- **Agente por defecto** (`discipline_defaults`): diseño →
  `senior-product-designer`, documentación → `knowledge-engineer`, marketing →
  `marketing-director`, growth → `growth-engineer`, investigación →
  `research-engineer`.
- **Revisores independientes** (`review_defaults`): diseño → QA
  `visual-qa-engineer` / revisión `head-of-product-design`; marketing → QA
  `brand-consistency-reviewer` / revisión `marketing-analytics-specialist`;
  growth → QA `marketing-analytics-specialist` / revisión
  `marketing-director`. El orquestador excluye al implementador; si no queda
  candidato, lo declara y pide una persona (`review-plan` → `missing`).
- **Reglas de enrutamiento** por etiquetas y rutas, con las reglas de la
  disciplina antes que las generales.

El registro canónico pasó de 18 a **38 perfiles**: 18 de Nexus Engineering y
20 de Nexus Thrive Studio (dirección de producto, diseño, sistema de diseño,
accesibilidad, Storybook, QA visual, marca, contenido, SEO, growth, social,
ventas y analítica). Los adaptadores de OpenCode y Claude Code se generan desde
ese registro; ninguno se edita a mano.

## Consecuencias

- Una tarea de diseño o marketing recorre exactamente las mismas compuertas que
  una de backend: no hay atajo para «solo es contenido».
- El estado sigue siendo revisable en un diff; la disciplina es un campo más.
- `nexus-eng loop --discipline design` explica el ciclo sin inventar estados.
- `nexus-eng review-plan <tarea>` evita la autoaprobación y deja explícito
  cuándo falta un revisor.
- La aprobación humana sigue siendo obligatoria para publicar, desplegar,
  gastar o prometer; el motor no la sustituye.

## Alternativas descartadas

- **Un backlog por disciplina:** rompe la fuente única y duplica dependencias.
- **Estados distintos por disciplina:** multiplica transiciones y hace
  incomparables las tareas.
- **Copiar agentes de catálogos externos:** se adaptaron 20 roles con
  atribución; copiar cientos degrada el enrutamiento (ver ADR 0008).
- **Permitir que el implementador se apruebe:** el núcleo lo rechaza
  (`Revisión no independiente`).
