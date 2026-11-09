# ADR-0007 · Soluciones especializadas sobre una plataforma de motores compartidos

- **Estado:** Aceptada · 2026-11-06 · responsable: santy401 (dueño del producto). Se adoptan también las recomendaciones D-1 a D-11 de la guía (§17).
- **Reemplaza:** la regla de producto de [`distribucion-por-rubro.md`](../../wiki/02-producto/distribucion-por-rubro.md) (rubro = perfil, todo incluido, encendido libre).
- **No reemplaza:** ADR 0001 (monolito modular), 0003 (registro de capacidades), 0006 (servicio de dinero) ni la estructura V10 de `lib/`.
- **Guía de producto:** [`docs/product/nexus-platform/README.md`](../../product/nexus-platform/README.md).

## Contexto

La regla vigente trata el rubro como un perfil y deja que cualquier negocio encienda cualquier función. Todo va incluido en todos los planes, y el límite es «usuarios, clientes, consumo; nunca una función ni un rubro».

Esa regla funcionó para unificar el núcleo, pero produce dos problemas:

1. Un gimnasio, un museo y una tienda ven el mismo producto. La experiencia no está diseñada para ninguna operación concreta.
2. El modelo comercial no distingue lo que se vende. No hay plan por tipo de negocio, ni derechos de uso finos (mesas QR, pantalla de cocina), ni límites propios de cada operación (sedes, mesas, productos).

## Decisión

1. **Cuatro niveles de producto:** Platform → Shared Business Engines → Solutions → Contexts & Extensions.
2. **Cinco soluciones** con identidad propia: Nexus Food, Gym, Museum, Commerce y Business. Business es una solución completa (clientes, servicios, cotizaciones, proyectos, entregables, cobros), no una categoría residual.
3. **Los rubros son contextos**, no arquitecturas. Configuran una solución con vocabulario, plantillas, campos y extensiones. Turismo y construcción son extensiones de Business. Un negocio híbrido combina contextos y capacidades compatibles.
4. **Los motores existen una sola vez**: CRM, Sales, Payments, Treasury, Finance, Accounting, Inventory, Documents, Operations, Projects, Purchasing, POS, QR, Website, Communication, Automation, Integrations e Insights. Las soluciones los componen y ninguna los duplica.
5. **Compatibilidad y derecho son cosas distintas.** La solución decide qué capacidades son compatibles; el plan (entitlements y límites) decide qué se puede usar y cuánto. Los entitlements no definen la estructura de datos.
6. **Modelo comercial:** plan base por solución, más capacidad de uso (usuarios, sedes, volumen, mesas, miembros o productos), más servicios (implementación, migración, web, integraciones, automatizaciones, soporte).
7. **Sin mover código:** las soluciones se apoyan en el registro de capacidades (ADR 0003) con un manifiesto por solución. No se renombra `lib/industry/` ni se mueven carpetas.

## Correspondencia con las áreas V10 de `lib/`

| Concepto de producto | Área V10 donde vive | Nota |
|---|---|---|
| Platform | `foundation`, `core`, `platform` | Sin cambio |
| Motores comerciales y operativos | `business`, `core/parties` | Sin cambio |
| Motores financieros | `domains/finance` + `business/sales` (`money-service`) | «Finance» es concepto, no área nueva |
| Automation | `core/events` + `core/operations` | **Por decidir (D-11):** área propia o submódulo de Core |
| Insights | `experience/dashboard` + lecturas en `business` | **Por decidir (D-11)** |
| Integrations | `integrations` | Sin cambio |
| Solutions y extensiones | `industry` | Nombre vigente; «solución» es concepto de producto |
| Experience | `experience`, `app/` | Sin cambio |

## Transición (sin pérdida)

- Cada negocio existente recibe una solución según su rubro. La asignación se puede revisar a mano y se revisa antes de ocultar algo.
- Ningún negocio pierde datos ni funciones que use hoy durante la transición.
- `TenantModule`, `VERTICAL_RECIPES` y el registro de capacidades se conservan; cambia quién decide el encendido.

## Alternativas

- **Mantener la regla vigente:** más simple, pero no resuelve la experiencia ni el modelo comercial.
- **Una aplicación por rubro:** duplica motores y contradice ADR 0001.
- **Solo entitlements, sin soluciones:** controla el precio, pero no diseña la experiencia de cada operación.

## Consecuencias

- `distribucion-por-rubro.md` queda reemplazado; la wiki de producto se alinea.
- Hacen falta: un manifiesto de solución en el registro de capacidades, planes por solución y entitlements finos sobre `PlanSetting` y los medidores.
- Decisiones D-1 a D-11 de la guía de producto (§17): aceptadas con su recomendación el 2026-11-06. D-5 se concreta en el ADR 0009.
- Se necesitan ADR propios para el QR dinámico (D-5), Payments/Treasury (D-8 a D-10) y Automation (D-11).
