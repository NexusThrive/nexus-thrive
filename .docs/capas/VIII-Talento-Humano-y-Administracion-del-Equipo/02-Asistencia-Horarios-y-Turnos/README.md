---
id: VIII.02
capa: "VIII — TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
titulo: "Asistencia, horarios y turnos"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VIII.02 — Asistencia, horarios y turnos

> Escalera de madurez de la subcapa **VIII.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `schedules`, `shifts`, `attendance-records`, `leave-requests` |
| Eventos (outbox → webhooks) | `shift.assigned`, `attendance.recorded`, `attendance.late`, `leave.requested`, `leave.approved` |
| MCP · lectura | `get_schedule`, `list_attendance` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `assign_shift`, `approve_leave` |
| Sistemas externos (puertos y adaptadores) | Biométricos / relojes, QR y NFC de la subcapa de acceso |

#### Integración

- [ ] API REST de lectura: schedules, shifts, attendance-records, leave-requests (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: shift.assigned, attendance.recorded, attendance.late, leave.requested, leave.approved (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_schedule, list_attendance (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: assign_shift, approve_leave (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de jornadas, turnos y reglas de asistencia

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Asistencia, horarios y turnos»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Asistencia, horarios y turnos»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `schedules`, `shifts`, `attendance-records`, `leave-requests`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `shift.assigned`, `attendance.recorded`, `attendance.late`, `leave.requested`, `leave.approved`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro básico de asistencia

#### Funcionalidad

- [ ] Marcación de entrada y salida
- [ ] Registro de horas por día y por empleado.
- [ ] Horario base

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Horarios, turnos, novedades y horas trabajadas

#### Funcionalidad

- [ ] Turnos
- [ ] Geolocalización y geocerca
- [ ] Foto en la marcación
- [ ] Cálculo automático de horas
- [ ] Retardos, ausencias y salidas anticipadas
- [ ] Solicitud de cambio de turno
- [ ] Alertas al jefe cuando alguien no marca.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con empleados, calendario y nómina

#### Funcionalidad

- [ ] Reloj biométrico o lector
- [ ] Reglas de jornada
- [ ] Aprobación de horas extra
- [ ] Marcación offline
- [ ] Horarios por proyecto o por recurso
- [ ] Disponibilidad y preferencias
- [ ] Conexión directa con nómina
- [ ] Reportes
- [ ] Antifraude

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Notificaciones, consolidación y validaciones automatizadas

#### Funcionalidad

- [ ] Generación automática de turnos con IA
- [ ] Pronóstico de demanda de personal
- [ ] Bolsa de turnos
- [ ] Cumplimiento automático
- [ ] Marcación por voz, QR dinámico o reconocimiento facial
- [ ] Integración con control de acceso físico
- [ ] Multi-sede y multi-empresa

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de cobertura, ausencias y planificación

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Asistencia, horarios y turnos» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Gestión empresarial de turnos y fuerza laboral

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

