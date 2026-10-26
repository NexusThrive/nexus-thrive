---
description: Planifica un sprint con dependencias, capacidad y criterios de cierre
agent: engineering-manager
---

Planifica el sprint con este objetivo: $ARGUMENTS

1. Lee `docs/product/plan.md`, el backlog y
   `scripts/nexus-eng readiness --json`.
2. Verifica que las dependencias de cada historia estén `merged`; no planifiques
   una historia con dependencias abiertas salvo que sea la primera de la cadena.
3. Propón un objetivo de sprint verificable y un conjunto pequeño de historias
   (máximo 5). Justifica el orden por dependencias y riesgo.
4. Registra el sprint:
   `scripts/nexus-eng sprint-add S<nn> --goal "<objetivo>"`
5. Asegura que cada historia tiene tarea en el núcleo con `--sprint S<nn>`:
   `scripts/nexus-eng add-task ...` (si falta) y `scripts/nexus-eng assign <id>`.
6. Pide a `project-manager` que escriba el plan del sprint en
   `docs/ingenieria/sprints/S<nn>/plan.md` con: objetivo, historias, dependencias,
   riesgos, criterio de cierre y qué queda fuera.
7. Termina con `scripts/nexus-eng status --json` y un resumen para el usuario.

No empieces a implementar. No prometas fechas que no puedas verificar.
