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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Gestión documental y firma electrónica»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Gestión documental y firma electrónica»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `documents`, `document-versions`, `signature-requests`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `document.uploaded`, `document.signed`, `signature.declined`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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
- [ ] Firma electrónica de documentos con evidencia (quién, cuándo, desde dónde) y verificación posterior _(propuesta)_

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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Gestión documental y firma electrónica» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Gobierno documental empresarial y evidencia de integridad

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

