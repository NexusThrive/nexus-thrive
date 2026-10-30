# Siguiente paso: el sistema y el orden de restaurantes

Estado al 2026-10-30. Este archivo existe para retomar el trabajo sin depender de la memoria de ninguna sesión.

## Dónde estamos

- El equipo de ingeniería son **subagentes nativos** del plugin `plugins/product-team` (43 agentes, una skill por rol,
  más el Steward). Se retiró el núcleo Python. Decisión: [ADR 0013](ingenieria/adr/0013-subagentes-nativos-en-plugin.md)
  (propuesta, pendiente de aceptación humana) y [ADR 0012](ingenieria/adr/0012-agente-steward.md) (Steward).
- Quedan **abiertos a propósito** los dos PR de restaurante, que son el siguiente trabajo:
  - **Investigación de Colega Menus** (`NexusRestaurant/`): arquitectura observada, mapa del panel, módulos, modelo de
    datos inferido y propuesta de integración hueco por hueco (RST-3 a RST-9), con decisiones D1–D6.
  - **Arquitectura Core, compartido y rubros** (`.docs/capas/ARQUITECTURA-CORE-Y-RUBROS.md`): tres anillos, reglas de
    dependencia F1–F7, fases F0–F9 y decisiones D-1 a D-8.

## Qué sigue, en orden

1. **Decidir sobre la arquitectura de rubros.** El PR de arquitectura pide revisión humana de **D-1, D-2, D-4 (G-04) y D-6
   antes de abrir las historias de la fase 0**. D-1 a D-8 requieren aprobación humana.
2. **Revisar la propuesta de integración de restaurante** (documento `07-integracion-nexus` del PR de investigación):
   decisiones D1–D6 y fases.
3. **Cerrar lo que el propio PR dice que no verificó**, antes de la fase 0: si Prisma 8 permite partir `contract.prisma`
   (D-3); cuántos archivos importan de `lib/business/`; y que `scripts/capas-progreso.mjs` acepte carpetas nuevas en la
   capa XI.
4. **Abrir las historias de la fase 0** con el plugin: skill `nueva-funcionalidad` (mesa de trabajo → product owner →
   analista de requerimientos → project manager) y el Steward para estructurar la capa y el orden de fases. Cada historia
   la revisa **otro** subagente, nunca quien la implementó.

## Pendientes heredados (no bloquean lo anterior)

| Qué | Dónde |
|---|---|
| 7 puntos del criterio del dueño sin llenar: sin ellos el Steward solo pregunta | `docs/ingenieria/steward/criterios.md` §P |
| 70 casillas `[x]` sin la nota «hecho: dónde» | `.docs/capas` (regla en `.docs/capas/README.md`) |
| 2 casillas ambiguas de V/02: «Planes de suscripción» (línea 73) y «Implementado en la rama actual» (línea 79) | `.docs/capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md` |
| NotebookLM (Gemini Notebook): investigación diferida | [`PENDIENTES.md` §7](PENDIENTES.md) |
| Aceptar o rechazar los ADR 0012 y 0013 | `docs/ingenieria/adr/` |
| Unificar los 4 agentes heredados con `backend-engineer`, `frontend-engineer`, `qa-engineer` y `senior-reviewer` | `plugins/product-team/agents/` |
| Decidir si se reescribe el historial de git para quitar `.tools/` (~195 MB) | ver el PR «deja de versionar .tools» |

## Cómo retomar con el plugin

```text
/plugin marketplace add NexusThrive/nexus-thrive
/plugin install product-team@nexus-thrive
```

Si sigues viendo el plugin `product-team` sincronizado desde claude.ai, el instalado desde este repositorio tiene
prioridad por nombre. El plugin **no incluye hooks**: las reglas de ramas dependen de las instrucciones, del job
`branch-name` del CI y de la protección de ramas de GitHub.
