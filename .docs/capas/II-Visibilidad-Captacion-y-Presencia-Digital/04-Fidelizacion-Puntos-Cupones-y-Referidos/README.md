---
id: II.04
capa: "II — VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
titulo: "Fidelización, puntos, cupones y referidos"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# II.04 — Fidelización, puntos, cupones y referidos

> Escalera de madurez de la subcapa **II.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `loyalty-programs`, `points-ledger`, `coupons`, `referrals` |
| Eventos (outbox → webhooks) | `points.earned`, `points.redeemed`, `coupon.redeemed`, `referral.converted` |
| MCP · lectura | `get_customer_points`, `list_coupons` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `grant_points`, `create_coupon` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: loyalty-programs, points-ledger, coupons, referrals (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: points.earned, points.redeemed, coupon.redeemed, referral.converted (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_customer_points, list_coupons (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: grant_points, create_coupon (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de fidelización y reglas de recompensa

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Fidelización, puntos, cupones y referidos»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Fidelización, puntos, cupones y referidos»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `loyalty-programs`, `points-ledger`, `coupons`, `referrals`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `points.earned`, `points.redeemed`, `coupon.redeemed`, `referral.converted`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro de clientes y recompensas básicas

#### Funcionalidad

- [ ] Cupones de descuento
- [ ] Registro de clientes frecuentes
- [x] Membresías simples — _hecho: módulo Membresías_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Puntos, niveles, canjes y referidos

#### Funcionalidad

- [ ] Programa de puntos
- [ ] Referidos
- [ ] Membresías con cobro recurrente
- [ ] Cupones por segmento
- [x] Tarjeta digital o QR de cliente — _hecho: carné `/crm/{id}/carnet` con QR y NFC_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM, ventas y pagos

#### Funcionalidad

- [ ] Niveles o categorías
- [ ] Reglas de canje y expiración
- [ ] Antifraude
- [ ] Automatizaciones
- [ ] Paquetes y bonos prepagados
- [ ] Reportes
- [ ] Contabilidad de pasivos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Acumulación, vencimientos y recompensas automatizadas

#### Funcionalidad

- [ ] Fidelización personalizada con IA
- [ ] Gamificación
- [ ] Programas entre negocios
- [ ] Billetera digital
- [ ] Suscripciones con pausa, cambio de plan y recuperación de cobros fallidos.
- [ ] Análisis de LTV y churn

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Segmentación y personalización de incentivos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Fidelización, puntos, cupones y referidos» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Recomendación de canal, horario y presupuesto a partir de resultados ya medidos (no de supuestos) _(propuesta)_
- [ ] Borradores de contenido y respuestas con revisión humana antes de publicar _(propuesta)_
- [ ] Atribución asistida: qué acción trajo qué cliente, con la regla de atribución visible _(propuesta)_


## N6 — Ecosistema avanzado de fidelización y referidos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación con muchas marcas, sedes o cuentas desde un mismo panel, con permisos por marca _(propuesta)_
- [ ] Cumplimiento: consentimiento, preferencias y bajas respetadas en todos los canales _(propuesta)_
- [ ] Límites por plan y consumo medido (envíos, consultas, almacenamiento) _(propuesta)_

