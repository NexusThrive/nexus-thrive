---
id: X.01
capa: "X — PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD"
titulo: "White-label, dominios e identidad visual"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# X.01 — White-label, dominios e identidad visual

> Escalera de madurez de la subcapa **X.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `brand-settings`, `custom-domains`, `email-domains` |
| Eventos (outbox → webhooks) | `domain.verified`, `brand.updated` |
| MCP · lectura | `get_brand_settings`, `get_domain_status` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `update_brand_settings`, `add_custom_domain` |
| Sistemas externos (puertos y adaptadores) | DNS, certificados TLS |

#### Integración

- [ ] API REST de lectura: brand-settings, custom-domains, email-domains (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: domain.verified, brand.updated (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_brand_settings, get_domain_status (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: update_brand_settings, add_custom_domain (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de marca, dominios y configuración visual

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «White-label, dominios e identidad visual»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «White-label, dominios e identidad visual»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `brand-settings`, `custom-domains`, `email-domains`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `domain.verified`, `brand.updated`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Personalización básica de marca y logotipo

#### Funcionalidad

- [ ] Logo, colores y nombre del negocio
- [ ] Subdominio propio
- [ ] Correos y mensajes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Temas, colores, dominios y activos de marca

#### Funcionalidad

- [ ] Dominio propio
- [ ] Correo de envío con dominio propio
- [ ] Marca completa
- [ ] Quitar o reemplazar la marca de la plataforma
- [ ] Portales de clientes y proveedores con la marca del negocio.
- [ ] Idiomas y textos personalizables.
- [ ] Portal de cliente con acceso limitado a sus propios datos (facturas, citas, pagos) _(propuesta)_
- [ ] Portales de proveedor y de empleado con la misma base y permisos propios _(propuesta)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con tenants, sitios web y paneles

#### Funcionalidad

- [ ] App móvil con marca del negocio
- [ ] Revendedores y agencias (partners)
- [ ] Temas y plantillas
- [ ] Configuración por entorno
- [ ] Dominios de correo y de enlaces cortos
- [ ] Control de funciones visibles
- [ ] Gestión de certificados y dominios

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Aprovisionamiento y configuración de marca automatizados

#### Funcionalidad

- [ ] Plataforma white-label completa
- [ ] Apps nativas personalizadas publicadas automáticamente
- [ ] Instancias dedicadas
- [ ] Constructor de módulos y pantallas sin código
- [ ] Configuración como código
- [ ] Marketplace de plantillas de negocio por vertical
- [ ] Gestión de marca a escala

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Personalización contextual y gestión de múltiples marcas

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «White-label, dominios e identidad visual» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Plataforma white-label empresarial multitenant

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

