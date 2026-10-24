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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Plataforma white-label empresarial multitenant

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

