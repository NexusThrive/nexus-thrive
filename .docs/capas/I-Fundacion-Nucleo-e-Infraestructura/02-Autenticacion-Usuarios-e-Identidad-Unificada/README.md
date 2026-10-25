---
id: I.02
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Autenticación, usuarios e identidad unificada"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# I.02 — Autenticación, usuarios e identidad unificada

> Escalera de madurez de la subcapa **I.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `members`, `invitations`, `sessions (solo lectura)` |
| Eventos (outbox → webhooks) | `member.invited`, `member.joined`, `member.removed` |
| MCP · lectura | `list_team_members` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `invite_member` |
| Sistemas externos (puertos y adaptadores) | Clerk (identidad), OAuth 2.0 para clientes de la API |

#### Integración

- [ ] API REST de lectura: members, invitations, sessions (solo lectura) (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: member.invited, member.joined, member.removed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_team_members (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: invite_member (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de identidad

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Autenticación, usuarios e identidad unificada»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Autenticación, usuarios e identidad unificada»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `members`, `invitations`, `sessions (solo lectura)`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `member.invited`, `member.joined`, `member.removed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro, inicio y cierre de sesión

#### Funcionalidad

- [x] Correo y contraseña
- [x] Recuperación de contraseña
- [x] Cierre de sesión
- [x] Reglas mínimas de contraseña

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión completa de usuarios, perfiles y sesiones

#### Funcionalidad

- [ ] 2FA
- [ ] Inicio de sesión con Google y Microsoft.
- [ ] Código por WhatsApp o SMS
- [ ] Lista de sesiones activas
- [ ] Aviso por correo o WhatsApp
- [ ] Bloqueo temporal
- [x] Una persona en varias organizaciones: selector de negocio y último dueño protegido _hecho: lib/tenant/membership.ts (businessesOfMember, rememberBusiness) · PR #109 · prueba lib/tenant/membership.integration.test.ts_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración de identidad entre módulos y tenants

#### Funcionalidad

- [ ] 2FA obligatorio por negocio o por rol
- [ ] Passkeys / WebAuthn
- [ ] SSO empresarial
- [ ] Políticas de sesión
- [ ] Restricciones de acceso
- [ ] Protección de la cuenta del SuperAdmin
- [ ] Alertas y registro de seguridad

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Automatización del ciclo de vida de usuarios

#### Funcionalidad

- [ ] Autenticación adaptativa
- [ ] Detección de robo de sesión y de credenciales filtradas
- [ ] Gestión de dispositivos
- [ ] Acceso de proveedores y soporte con acceso justo a tiempo
- [ ] Autenticación sin contraseña
- [ ] Autenticación de clientes finales
- [ ] Certificaciones y pruebas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de comportamientos anómalos y controles adaptativos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Autenticación, usuarios e identidad unificada» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Identidad empresarial, SSO y federación de identidades

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

