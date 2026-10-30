# Arquitectura del equipo de ingeniería

El equipo son **subagentes nativos de Claude Code** empaquetados en el plugin
[`plugins/product-team`](../../../plugins/product-team/README.md). No hay motor externo:
la independencia de la revisión la da usar otro subagente, y la evidencia es la salida real
de los comandos y los commits.

| Pieza | Dónde |
| --- | --- |
| 43 subagentes (`agents/<id>.md`) | `plugins/product-team/agents/` |
| Una skill por rol (`skills/<id>/SKILL.md`) y skills de flujo | `plugins/product-team/skills/` |
| Instalación del plugin | `.claude-plugin/marketplace.json` |
| Compuerta de calidad (comandos del proyecto) | `.product-team/ci.json`, `CLAUDE.md`, CI |
| Criterio del dueño que aplica el Steward | `docs/ingenieria/steward/criterios.md` |
| Registro de herramientas externas evaluadas | `docs/ingenieria/herramientas/registro.json` |
| Decisiones | [`docs/ingenieria/adr/`](../adr/README.md) |
| Diseño anterior (retirado) | [`docs/ingenieria/archivo/motor-python/`](../archivo/motor-python/README.md) |

## Lo que se perdió al retirar el motor

- **Memoria entre sesiones y clientes.** El estado ya no vive en `tasks.json`: vive en git (ramas, PR, informes de sprint).
- **Límite de 3 intentos y pausa forzados por código.** Ahora son instrucciones en las skills (`ciclo-sprint` conserva `docs/ingenieria/PAUSA`).
- **Exclusión automática del implementador como revisor.** Ahora es una regla que cumple quien orquesta.
- **Soporte de OpenCode.** Los adaptadores se eliminaron; el plugin es solo para Claude Code.
