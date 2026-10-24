---
id: VI.03
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Gestión documental y firma electrónica"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VI.03 — Gestión documental y firma electrónica

> Escalera de madurez de la subcapa **VI.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `documents`, `document-versions`, `signature-requests` |
| Eventos (outbox → webhooks) | `document.uploaded`, `document.signed`, `signature.declined` |
| MCP · lectura | `search_documents`, `get_document_file_link` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `upload_document`, `request_signature` |
| Sistemas externos (puertos y adaptadores) | Firma electrónica (proveedor autorizado: Certicámara, Olimpia, DocuSign) |

#### Integración

- [ ] API REST de lectura: documents, document-versions, signature-requests (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: document.uploaded, document.signed, signature.declined (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: search_documents, get_document_file_link (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: upload_document, request_signature (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de documentos, versiones y firmantes

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Carga, consulta y descarga de documentos

#### Funcionalidad

- [ ] Carga de archivos
- [ ] Plantillas básicas
- [ ] Descarga en PDF y envío por correo o WhatsApp.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Carpetas, permisos, versiones y flujos de firma

#### Funcionalidad

- [ ] Plantillas con variables automáticas
- [ ] Control de versiones
- [ ] Firma electrónica simple
- [ ] Estados
- [ ] Vencimientos y alertas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con usuarios, clientes y operaciones

#### Funcionalidad

- [ ] Flujo de revisión y aprobación
- [ ] Firma múltiple y en orden
- [ ] Biblioteca de cláusulas
- [ ] Permisos por documento
- [ ] Evidencia de firma con validez probatoria
- [ ] Clasificación y etiquetas
- [ ] Retención y archivo

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Generación documental, solicitudes y vencimientos automatizados

#### Funcionalidad

- [ ] Gestión del ciclo de vida de contratos
- [ ] Generación y revisión con IA
- [ ] Firma digital con certificado
- [ ] Extracción automática de datos
- [ ] Repositorio legal
- [ ] Portal de documentos
- [ ] Integración con almacenamiento externo

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Clasificación inteligente y extracción de información

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gobierno documental empresarial y evidencia de integridad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

