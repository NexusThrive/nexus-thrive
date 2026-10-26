---
description: Convierte una idea en funcionalidad, historias y tareas ejecutables
agent: engineering-manager
---

Procesa esta solicitud: $ARGUMENTS

Sigue el flujo canónico, sin saltarte etapas y sin escribir código todavía:

1. **Descubrimiento** — usa el subagente `mesa-de-trabajo` para mapear el código y
   el dominio existente. Exige referencias a archivos reales. Si Graphify está
   disponible, consulta el grafo; si no, dilo explícitamente.
2. **Producto** — usa `product-owner` para escribir
   `docs/product/funcionalidades/<slug>.md` con problema, valor, alcance,
   no-alcance y prioridad.
3. **Requisitos** — usa `requirements-analyst` para escribir
   `docs/product/backlog/<slug>.md` con historias `HU-<slug>-<nn>`, criterios de
   aceptación verificables y dependencias.
4. **Registro** — registra cada historia ejecutable en el núcleo:
   `scripts/nexus-eng add-task --id HU-<slug>-<nn> --title "<título>" --story <slug> --priority <0-3> --depends-on <ids> --tags <tags> --paths <rutas> --acceptance "<criterio>"`
   Las dependencias deben existir ya o registrarse antes.
5. **Plan** — pide a `project-manager` que actualice `docs/product/plan.md` con el
   orden por dependencias, riesgos y bloqueos.
6. **Cierre** — ejecuta `scripts/nexus-eng readiness` y `scripts/nexus-eng status`.
   Muestra al usuario las historias creadas y qué queda listo para sprint.

Reglas:
- No inventes hallazgos: cita archivos o marca la suposición.
- No modifiques criterios de aceptación para que una prueba pase.
- No inicies implementación en este comando.
