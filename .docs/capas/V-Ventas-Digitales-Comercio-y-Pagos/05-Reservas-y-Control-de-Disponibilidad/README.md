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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión avanzada de disponibilidad multirrecurso y multisede

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

