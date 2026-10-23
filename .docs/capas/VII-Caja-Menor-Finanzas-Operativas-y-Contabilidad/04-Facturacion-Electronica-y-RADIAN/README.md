---
id: VII.04
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Facturación electrónica y RADIAN"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VII.04 — Facturación electrónica y RADIAN

> Escalera de madurez de la subcapa **VII.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

## N0 — Fundamento normativo y ciclo de documentos electrónicos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Generación de documentos electrónicos básicos

#### Funcionalidad

- [ ] Factura electrónica
- [ ] Datos del emisor y del adquirente
- [ ] PDF y XML
- [ ] Documento soporte
- [ ] Factura electrónica por proveedor tecnológico detrás de un puerto (`EInvoicePort`); no firmar XML propio _(objetivo 2026 · ver `docs/PENDIENTES.md`)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Validación, estados, notas crédito y notas débito

#### Funcionalidad

- [ ] Factura automática
- [ ] Notas crédito y débito electrónicas
- [ ] Estado ante la DIAN
- [ ] Impuestos por ítem y por tercero
- [ ] Gestión de resoluciones y consecutivos
- [ ] Factura de venta en POS

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con proveedor tecnológico, DIAN y módulos financieros

#### Funcionalidad

- [ ] Cola de emisión con reintentos
- [ ] Eventos RADIAN
- [ ] Declaraciones asistidas
- [ ] Información exógena
- [ ] Certificados de retención
- [ ] Calendario tributario
- [ ] Soporte del régimen del negocio

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Envíos, seguimiento y gestión automatizada de respuestas

#### Funcionalidad

- [ ] Multi-NIT y multiempresa
- [ ] Validación automática de facturas recibidas
- [ ] Facturación internacional
- [ ] Motor de reglas fiscales con vigencia
- [ ] Conciliación de impuestos
- [ ] Preparación de auditorías

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de rechazos, inconsistencias y riesgos de cumplimiento

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de facturación electrónica y eventos RADIAN aplicables

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

