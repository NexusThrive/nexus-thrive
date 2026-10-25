---
id: V.05
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Reservas y control de disponibilidad"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# V.05 — Reservas y control de disponibilidad

> Escalera de madurez de la subcapa **V.05**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `resources`, `availability`, `bookings`, `waitlists` |
| Eventos (outbox → webhooks) | `booking.created`, `booking.rescheduled`, `booking.canceled`, `booking.checked_in`, `booking.no_show` |
| MCP · lectura | `get_availability`, `list_bookings` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_booking`, `cancel_booking` |
| Sistemas externos (puertos y adaptadores) | Google Calendar / Outlook (VI.01) |

#### Integración

- [ ] API REST de lectura: resources, availability, bookings, waitlists (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: booking.created, booking.rescheduled, booking.canceled, booking.checked_in, booking.no_show (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_availability, list_bookings (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_booking, cancel_booking (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de recursos, horarios y disponibilidad

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Reservas y control de disponibilidad»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Reservas y control de disponibilidad»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `resources`, `availability`, `bookings`, `waitlists`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `booking.created`, `booking.rescheduled`, `booking.canceled`, `booking.checked_in`, `booking.no_show`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro y consulta de reservas

#### Funcionalidad

- [ ] Formulario de solicitud de reserva _(PR-26)_
- [x] Calendario de disponibilidad — _hecho: agenda con cupos; taquilla con franjas y aforo_
- [ ] Confirmación manual por WhatsApp o correo.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Calendarios, capacidad, cancelaciones y reprogramaciones

#### Funcionalidad

- [ ] Disponibilidad automática
- [ ] Reserva con pago
- [ ] Tarifas por temporada, por personas o por noche
- [ ] Bloqueo temporal (hold)
- [ ] Widget embebible
- [ ] Recordatorios

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con clientes, pagos y notificaciones

#### Funcionalidad

- [ ] Políticas de cancelación
- [ ] Extras y upsells
- [ ] Overbooking controlado
- [ ] Reglas por recurso
- [ ] Códigos promocionales, grupos y reservas múltiples.
- [ ] Panel de ocupación
- [ ] Integración con canales
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Confirmaciones, recordatorios y listas de espera automatizadas

#### Funcionalidad

- [ ] Tarifas dinámicas con IA
- [ ] Asignación óptima de recursos
- [ ] Reserva por chat y voz
- [ ] Multi-propiedad y multi-sede
- [ ] Paquetes dinámicos
- [ ] Check-in digital
- [ ] API pública

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Optimización de capacidad y predicción de demanda

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Reservas y control de disponibilidad» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Gestión avanzada de disponibilidad multirrecurso y multisede

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

