# Decisiones

## Responsabilidad

Registro central de decisiones del monolito. Las series de arquitectura e ingeniería conservan sus identificadores originales; el nombre del archivo distingue las colisiones.

## Registro

| ID original | Título | Estado original | Fecha | Responsables |
| --- | --- | --- | --- | --- |
| [arquitectura/0001](ADR-0001-arquitectura-monolito-modular.md) | Mantener un monolito modular | Propuesta · 2026-10-22 | 2026-10-22 | No consta explícitamente |
| [arquitectura/0002](ADR-0002-arquitectura-identidad-y-membresias.md) | Identidad: Clerk + membresía `User` | Propuesta · 2026-10-22 | 2026-10-22 | No consta explícitamente |
| [arquitectura/0003](ADR-0003-arquitectura-registro-de-capacidades.md) | Registro de capacidades en código y entitlements en servidor | Aceptada en parte | 2026-10-23 | No consta explícitamente |
| [arquitectura/0004](ADR-0004-arquitectura-aislamiento-en-aplicacion.md) | Aislamiento en la aplicación + defensas mínimas en base | Propuesta · 2026-10-22 | 2026-10-22 | No consta explícitamente |
| [arquitectura/0005](ADR-0005-arquitectura-esquema-de-produccion.md) | Migraciones de Prisma como única fuente del esquema | Propuesta · 2026-10-22 | 2026-10-22 | No consta explícitamente |
| [arquitectura/0006](ADR-0006-arquitectura-servicio-de-dinero.md) | Servicio transaccional único para el dinero | Propuesta · 2026-10-22 | 2026-10-22 | No consta explícitamente |
| [arquitectura/0007](ADR-0007-arquitectura-soluciones-sobre-plataforma.md) | Soluciones especializadas sobre una plataforma de motores compartidos | Aceptada · 2026-11-06 · responsable: santy401 (dueño del producto). Se adoptan también las recomendaciones D-1 a D-11 de la guía (§17). | 2026-11-06 | santy401 |
| [arquitectura/0008](ADR-0008-arquitectura-payments-y-treasury.md) | Payments y Treasury: obligaciones, aplicaciones, cuentas y liquidaciones | Aceptada · 2026-11-06 · responsable: santy401. Concreta D-8, D-9 y D-10 de la [guía de producto](../01-producto/estrategia/README.md) §17. | 2026-11-06 | santy401 |
| [arquitectura/0010](ADR-0010-arquitectura-whatsapp-por-negocio.md) | WhatsApp Business propio de cada negocio | Aceptada · 2026-11-07 · responsable: santy401. Concreta el requisito de la [guía de producto](../01-producto/estrategia/README.md) §11. | 2026-11-07 | santy401 |
| [arquitectura/0011](ADR-0011-arquitectura-aprovisionamiento-administrado.md) | Aprovisionamiento privado de negocios administrados | Propuesta; pendiente de revisión humana | 2026-11-16 | Dueño del producto y revisión de arquitectura pendientes |
| [ingenieria/0001](ADR-0001-ingenieria-nucleo-local-python.md) | Núcleo local en Python 3.12 | reemplazada por 0013 | 2026-10-25 | No consta explícitamente |
| [ingenieria/0002](ADR-0002-ingenieria-fuente-unica-de-verdad.md) | Fuente única de verdad | aceptada | 2026-10-25 | No consta explícitamente |
| [ingenieria/0003](ADR-0003-ingenieria-persistencia-local-primero.md) | Persistencia local primero | reemplazada por 0013 | 2026-10-25 | No consta explícitamente |
| [ingenieria/0004](ADR-0004-ingenieria-adaptadores-generados.md) | Adaptadores generados desde fuentes canónicas | reemplazada por 0013 | 2026-10-25 | No consta explícitamente |
| [ingenieria/0005](ADR-0005-ingenieria-puente-http-n8n.md) | Puente HTTP autenticado para n8n | reemplazada por 0013 | 2026-10-25 | No consta explícitamente |
| [ingenieria/0006](ADR-0006-ingenieria-integraciones-no-disponibles.md) | Declarar Graphify y NotebookLM como no disponibles | aceptada; parte de Graphify reemplazada por [0009](ADR-0009-ingenieria-graphify-vs-codebase-memory.md) | 2026-10-25 | No consta explícitamente |
| [ingenieria/0007](ADR-0007-ingenieria-reconstruccion-product-team.md) | Reconstrucción del Product Team | parcialmente reemplazada por 0013 | 2026-10-25 | No consta explícitamente |
| [ingenieria/0008](ADR-0008-ingenieria-herramientas-externas-adopcion-selectiva.md) | Adopción selectiva de herramientas y skills externas | aceptada | 2026-10-25 | No consta explícitamente |
| [ingenieria/0009](ADR-0009-ingenieria-graphify-vs-codebase-memory.md) | Graphify como grafo estructural; Codebase Memory diferido | aceptada | 2026-10-25 | No consta explícitamente |
| [ingenieria/0010](ADR-0010-ingenieria-dos-equipos-y-loops-compartidos.md) | Dos equipos, un motor y loops por disciplina | aceptada; el motor y los estados quedan reemplazados por 0013 | 2026-10-25 | No consta explícitamente |
| [ingenieria/0011](ADR-0011-ingenieria-rechazo-openhands.md) | Rechazo de OpenHands como plataforma de ejecución | aceptada | 2026-10-25 | No consta explícitamente |
| [ingenieria/0012](ADR-0012-ingenieria-agente-steward.md) | Agente Steward: criterio del dueño, capas e historial | propuesta (la acepta una persona; ver «Regla» en el índice) | 2026-10-30 | No consta explícitamente |
| [ingenieria/0013](ADR-0013-ingenieria-subagentes-nativos-en-plugin.md) | Subagentes nativos en un plugin; se retira el núcleo Python | propuesta (la acepta una persona; ver «Regla» en el índice) | 2026-10-30 | No consta explícitamente |

## Identidad, numeración y estados

Los números 0001–0008 y 0010 coinciden entre series; la identidad completa es **serie/número**. Se conservan números, fechas, responsables y decisiones originales. Próximos números por encima del máximo: **arquitectura/0012** e **ingenieria/0014**. Arquitectura/0009 se cita en el ADR 0007, pero su archivo no está versionado: no se inventa ni se reutiliza ese hueco.

Las [decisiones D-V10](V10-decisiones.md) conservan su propio identificador. El estado de cada ADR original prevalece sobre antiguos resúmenes. Los ADR 0012 y 0013 de ingeniería siguen siendo propuestas, aunque describan herramientas usadas; la migración no los acepta.

Arquitectura/0007 reemplaza la política anterior de rubros y la [guía de estrategia](../01-producto/estrategia/README.md) contiene sus decisiones aprobadas. Las decisiones aceptadas no se reescriben para alinearlas con el kernel.

El dueño retiró operativamente Graphify y NotebookLM el 2026-11-16. Esto se registra en el catálogo de herramientas sin reescribir ingeniería/0009; un cambio formal de esa decisión requerirá un ADR sucesor. Las resoluciones del [sistema de diseño](../../packages/brand/docs/03-sistema/decisiones-nexus-design-system.md) y sus DR-* conservan su sistema e identidad en el paquete de marca.

Nuevas decisiones usan la [plantilla](plantilla.md). Las instantáneas narrativas anteriores se conservan en el histórico y no son un registro paralelo vigente.
