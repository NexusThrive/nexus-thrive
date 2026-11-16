# Documentación de NexusThrive · Thrive Business

Este es el punto de entrada a la documentación del monolito modular Next.js. Cada tema tiene una fuente responsable; el histórico conserva la evidencia de decisiones y entregas anteriores.

| Sección | Responsabilidad |
| --- | --- |
| [00 · Identidad](00-identidad/README.md) | Alcance y vocabulario |
| [01 · Producto](01-producto/README.md) | Estrategia, funcionalidades, backlog y plan |
| [02 · Arquitectura](02-arquitectura/README.md) | Monolito, dominios, datos y flujos |
| [03 · Experiencia](03-experiencia/README.md) | Diseño operativo, marca y accesibilidad |
| [04 · Integraciones](04-integraciones/README.md) | API, MCP, eventos y webhooks |
| [05 · Decisiones](05-decisiones/README.md) | ADR originales y decisiones V10 |
| [06 · Reglas](06-reglas/README.md) | Dependencias, autenticación y permisos |
| [07 · Ingeniería](07-ingenieria/README.md) | Convenciones, pruebas y sprints |
| [08 · Operaciones](08-operaciones/README.md) | Entornos, producción y recuperación |
| [09 · Histórico](09-historico/README.md) | Auditorías y evidencia fechada |

## Orden de lectura

Empieza por identidad y producto; continúa con arquitectura, decisiones y reglas. Para hacer un cambio, consulta ingeniería y sus pruebas. Para ejecutar tareas de producción, utiliza operaciones.

## Trabajo actual

El [plan de producto](01-producto/plan.md) indica el hito, sprint e historias confirmados. Las [convenciones de sprint](07-ingenieria/sprints/README.md) explican dónde registrar planes y cierres. No se deduce un sprint activo de documentos antiguos.

## Contribuir

Consulta el [estándar documental](07-ingenieria/documentation-standard.md) antes de crear una página. Actualiza la fuente existente y su índice en el mismo PR; separa propuesta, implementación y verificación. Ejecuta `pnpm docs:check` y las comprobaciones pertinentes. Las [instrucciones para contribuir](../CONTRIBUTING.md) y [AGENTS.md](../AGENTS.md) permanecen en la raíz.

La documentación se mantiene y consulta en este repositorio. No hay publicador ni una segunda fuente en GitHub Wiki.
