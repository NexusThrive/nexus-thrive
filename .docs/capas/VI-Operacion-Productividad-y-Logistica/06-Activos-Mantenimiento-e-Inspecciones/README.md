---
id: VI.06
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Activos, mantenimiento e inspecciones"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VI.06 — Activos, mantenimiento e inspecciones

> Escalera de madurez de la subcapa **VI.06**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `assets`, `maintenance-plans`, `work-orders`, `inspections` |
| Eventos (outbox → webhooks) | `work_order.created`, `work_order.completed`, `inspection.failed`, `asset.maintenance_due` |
| MCP · lectura | `list_assets`, `get_work_order`, `list_due_maintenance` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_work_order`, `record_inspection` |
| Sistemas externos (puertos y adaptadores) | Sensores / IoT (futuro) |

#### Integración

- [ ] API REST de lectura: assets, maintenance-plans, work-orders, inspections (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: work_order.created, work_order.completed, inspection.failed, asset.maintenance_due (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_assets, get_work_order, list_due_maintenance (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_work_order, record_inspection (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de activos, estados y planes de mantenimiento

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Activos, mantenimiento e inspecciones»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Activos, mantenimiento e inspecciones»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `assets`, `maintenance-plans`, `work-orders`, `inspections`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `work_order.created`, `work_order.completed`, `inspection.failed`, `asset.maintenance_due`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro y consulta de activos

#### Funcionalidad

- [ ] Registro de activos
- [ ] Responsable y ubicación
- [ ] Documentos y vencimientos
- [ ] Alertas de vencimiento
- [ ] Formularios de inspección
- [ ] Fotos tomadas desde el celular
- [ ] Informe en PDF

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Historial, inspecciones y órdenes de mantenimiento

#### Funcionalidad

- [ ] Mantenimientos preventivos
- [ ] Órdenes de trabajo
- [ ] Historial por activo
- [ ] Asignación de vehículos y equipos
- [ ] Registro de combustible, kilometraje y gastos
- [ ] Reportes de costo
- [ ] Plantillas por vertical
- [ ] Calificación y puntaje
- [ ] Hallazgos con responsable y fecha límite
- [ ] Geolocalización y hora automática
- [ ] Historial por sitio, activo o proveedor.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con inventario, tareas y documentos

#### Funcionalidad

- [ ] Reservas y disponibilidad de activos
- [ ] Rutas y despachos
- [ ] Seguimiento GPS
- [ ] Inspecciones previas al uso
- [ ] Control de repuestos e inventario
- [ ] Depreciación y valor en libros
- [ ] Costo por kilómetro, por hora y por servicio
- [ ] Gestión de conductores
- [ ] Modo sin conexión
- [ ] Firma del inspector y del responsable
- [ ] No conformidades
- [ ] Inspecciones programadas
- [ ] Marcar sobre la foto
- [ ] Protocolos y ensayos
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Mantenimiento preventivo y alertas automatizadas

#### Funcionalidad

- [ ] Optimización de rutas con IA
- [ ] Mantenimiento predictivo
- [ ] Ciclo de vida del activo
- [ ] Gestión de seguros y siniestros.
- [ ] Emisiones y sostenibilidad
- [ ] Integración con proveedores de GPS, tanqueo y peajes.
- [ ] Multi-sede y multi-negocio
- [ ] Análisis de fotos con IA
- [ ] Auditorías multi-sede
- [ ] Certificaciones y acreditaciones
- [ ] Control estadístico de calidad
- [ ] Inspecciones por drones, sensores o cámaras fijas.
- [ ] Portal para interventoría y clientes
- [ ] Calidad del proveedor

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Predicción de fallas y optimización del ciclo de vida

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Activos, mantenimiento e inspecciones» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Gestión empresarial de activos y mantenimiento

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

