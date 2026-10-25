---
title: B · Core y capacidades compartidas
tags: [arquitectura, core, compartidas]
updated: 2026-10-25
---

# B · Core y capacidades compartidas

Regla: **algo es Core solo si no puede depender de ningún rubro** (identidad, organizaciones, permisos, auditoría, aislamiento). Una capacidad compartida (dinero, inventario, contabilización, facturación, avisos) es un servicio que varias funciones usan; no se mueve al Core por parecer genérica y no se apropia de las reglas de cada rubro.


## A · Core

| ID | Capacidad | Categoría | Estado verificado | Hecho · pendiente · propuesta | Decisión | Dependencias | Evidencia | Criterio de aceptación |
|---|---|---|---|---|---|---|---|---|
| I.00 | Núcleo transversal y modelo de tercero único | A · Core | En progreso · con pruebas | 7 · 3 · 27 | **MANTENER** | — | [I.00](../capas/I-Fundacion-Nucleo-e-Infraestructura/00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md) · 2 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| I.02 | Autenticación, usuarios e identidad unificada | A · Core | En progreso · con pruebas | 5 · 20 · 15 | **MANTENER** | — | [I.02](../capas/I-Fundacion-Nucleo-e-Infraestructura/02-Autenticacion-Usuarios-e-Identidad-Unificada/README.md) · 3 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| I.03 | Permisos granulares y control de acceso (RBAC / ABAC) | A · Core | En progreso · con pruebas | 4 · 15 · 17 | **MANTENER** | I.02 | [I.03](../capas/I-Fundacion-Nucleo-e-Infraestructura/03-Permisos-Granulares-y-Control-de-Acceso-RBAC-ABAC/README.md) · 3 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| I.04 | Multi-tenancy y aislamiento de datos | A · Core | En progreso · con pruebas | 6 · 4 · 16 | **MANTENER** | I.02 | [I.04](../capas/I-Fundacion-Nucleo-e-Infraestructura/04-Multi-Tenancy-y-Aislamiento-de-Datos/README.md) · 15 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| I.06 | Auditoría, trazabilidad y bitácora | A · Core | En progreso · con pruebas | 4 · 21 · 16 | **MANTENER** | I.03, I.04 | [I.06](../capas/I-Fundacion-Nucleo-e-Infraestructura/06-Auditoria-Trazabilidad-y-Bitacora/README.md) · 1 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| I.07 | Respaldo, versionado y recuperación | A · Core | Pendiente de implementar | 0 · 24 · 15 | **RELLENAR** | I.04 | [I.07](../capas/I-Fundacion-Nucleo-e-Infraestructura/07-Respaldo-Versionado-y-Recuperacion/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| X.00 | Planes, suscripciones y control de consumo | A · Core | En progreso · con pruebas | 8 · 22 · 15 | **MANTENER** | I.04 | [X.00](../capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) · 9 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| X.03 | Cumplimiento legal, privacidad y seguridad | A · Core | En progreso · sin pruebas halladas | 2 · 25 · 15 | **RELLENAR** | I.06, I.07 | [X.03](../capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/03-Cumplimiento-Legal-Privacidad-y-Seguridad/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |

## B · Compartida

| ID | Capacidad | Categoría | Estado verificado | Hecho · pendiente · propuesta | Decisión | Dependencias | Evidencia | Criterio de aceptación |
|---|---|---|---|---|---|---|---|---|
| I.01 | Catálogo maestro de productos y servicios | B · Compartida | En progreso · con pruebas | 8 · 14 · 15 | **MANTENER** | I.00 | [I.01](../capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md) · 2 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| III.00 | Bandeja de entrada omnicanal | B · Compartida | Pendiente de implementar | 0 · 21 · 16 | **RELLENAR** | IV.00 | [III.00](../capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| IV.00 | Perfil integral del cliente (CRM 360) | B · Compartida | En progreso · sin pruebas halladas | 5 · 21 · 15 | **RELLENAR** | I.00 | [IV.00](../capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| IX.01 | Modelo semántico y catálogo de métricas | B · Compartida | En progreso · sin pruebas halladas | 4 · 4 · 24 | **RELLENAR** | VII.05, V.00, VI.04 | [IX.01](../capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/01-Modelo-Semantico-y-Catalogo-de-Metricas/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| IX.03 | Reportes automáticos y resúmenes ejecutivos | B · Compartida | Pendiente de implementar | 0 · 21 · 18 | **RELLENAR** | IX.01 | [IX.03](../capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/03-Reportes-Automaticos-y-Resumenes-Ejecutivos/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| V.00 | Pasarelas de pago e integraciones financieras | B · Compartida | En progreso · con pruebas | 4 · 20 · 15 | **MANTENER** | I.00, VII.03 | [V.00](../capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md) · 6 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| V.01 | Enlaces y solicitudes de cobro | B · Compartida | En progreso · con pruebas | 3 · 4 · 18 | **MANTENER** | V.00 | [V.01](../capas/V-Ventas-Digitales-Comercio-y-Pagos/01-Enlaces-y-Solicitudes-de-Cobro/README.md) · 3 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| V.02 | Suscripciones y cobros recurrentes | B · Compartida | En progreso · con pruebas | 1 · 13 · 20 | **MANTENER** | V.00, IV.00, I.01 | [V.02](../capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) · 1 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VI.03 | Gestión documental y firma electrónica | B · Compartida | Pendiente de implementar | 0 · 22 · 16 | **RELLENAR** | I.06 | [VI.03](../capas/VI-Operacion-Productividad-y-Logistica/03-Gestion-Documental-y-Firma-Electronica/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VI.04 | Inventarios, bodegas y logística | B · Compartida | En progreso · con pruebas | 9 · 17 · 15 | **MANTENER** | I.01 | [VI.04](../capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md) · 3 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VII.00 | Caja menor y arqueos | B · Compartida | En progreso · con pruebas | 11 · 33 · 15 | **MANTENER** | VII.03 | [VII.00](../capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/00-Caja-Menor-y-Arqueos/README.md) · 4 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VII.02 | Cuentas por cobrar, cuentas por pagar y cartera | B · Compartida | En progreso · con pruebas | 2 · 9 · 19 | **MANTENER** | V.00, IV.00 | [VII.02](../capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md) · 2 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VII.03 | Documentos transaccionales y reglas fiscales | B · Compartida | En progreso · con pruebas | 2 · 22 · 15 | **MANTENER** | I.00, I.01 | [VII.03](../capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/03-Documentos-Transaccionales-y-Reglas-Fiscales/README.md) · 3 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VII.04 | Facturación electrónica y RADIAN | B · Compartida | En progreso · con pruebas | 5 · 19 · 15 | **MANTENER** | VII.03 | [VII.04](../capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/04-Facturacion-Electronica-y-RADIAN/README.md) · 4 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VII.05 | Contabilidad general, PUC y estados financieros | B · Compartida | En progreso · con pruebas | 6 · 17 · 15 | **MANTENER** | VII.03 | [VII.05](../capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md) · 6 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VII.07 | Tesorería, bancos y liquidez | B · Compartida | Pendiente de implementar | 0 · 11 · 15 | **RELLENAR** | VII.05, V.00 | [VII.07](../capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/07-Tesoreria-Bancos-y-Liquidez/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| X.01 | White-label, dominios e identidad visual | B · Compartida | Pendiente de implementar | 0 · 23 · 17 | **RELLENAR** | I.04, I.02 | [X.01](../capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/01-White-Label-Dominios-e-Identidad-Visual/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| X.04 | Centro de ayuda y onboarding | B · Compartida | En progreso · con pruebas | 4 · 20 · 15 | **MANTENER** | I.02 | [X.04](../capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/04-Centro-de-Ayuda-y-Onboarding/README.md) · 2 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |

## B/D · Compartida y contrato

| ID | Capacidad | Categoría | Estado verificado | Hecho · pendiente · propuesta | Decisión | Dependencias | Evidencia | Criterio de aceptación |
|---|---|---|---|---|---|---|---|---|
| IX.04 | Copiloto de inteligencia artificial | B/D · Compartida y contrato | En progreso · con pruebas | 1 · 25 · 17 | **MANTENER** | I.05, X.02, IX.01 | [IX.04](../capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/04-Copiloto-de-Inteligencia-Artificial/README.md) · 2 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| VI.08 | Automatizaciones y flujos de trabajo | B/D · Compartida y contrato | Pendiente de implementar | 0 · 24 · 18 | **RELLENAR** | I.05 | [VI.08](../capas/VI-Operacion-Productividad-y-Logistica/08-Automatizaciones-y-Flujos-de-Trabajo/README.md) | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |

## D · Contrato

| ID | Capacidad | Categoría | Estado verificado | Hecho · pendiente · propuesta | Decisión | Dependencias | Evidencia | Criterio de aceptación |
|---|---|---|---|---|---|---|---|---|
| I.05 | Motor de eventos y webhooks | D · Contrato | En progreso · con pruebas | 2 · 3 · 15 | **MANTENER** | I.04 | [I.05](../capas/I-Fundacion-Nucleo-e-Infraestructura/05-Motor-de-Eventos-y-Webhooks/README.md) · 4 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |
| X.02 | API, webhooks y marketplace de módulos | D · Contrato | En progreso · con pruebas | 7 · 17 · 15 | **MANTENER** | I.05, I.03 | [X.02](../capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md) · 6 archivos de prueba | N0 (contrato) hecho y probado; N1 completo con prueba de aislamiento por organización; luego se abre N2 |

## Servicios verificados en el código (para no duplicarlos)

| Servicio | Dónde | Pruebas halladas |
|---|---|---|
| Aislamiento por organización (`tenantId` + `@@rls`) | `prisma/contract.prisma`, `lib/tenant/db.ts` | `lib/tenant/*.integration.test.ts`, `tenant-scope.test.ts` |
| Tercero único con roles | `lib/parties` | `lib/parties` |
| Dinero (único punto) | `lib/business/money-service.ts` | `money-service.integration.test.ts` |
| Inventario y costeo | `lib/inventory` | `lib/inventory` |
| Contabilización | `lib/accounting` | `lib/accounting` |
| Impuestos | `lib/tax` | `lib/tax` |
| Factura electrónica (adaptador) | `lib/einvoice` | `lib/einvoice` |
| Eventos (outbox) y webhooks | `lib/events` | `lib/events` |
| Registro de funciones y navegación | `lib/capabilities/registry.ts`, `lib/functions` | `lib/functions/functions.test.ts` |
| MCP (lectura) | `lib/mcp` | `lib/mcp` |

_Las rutas existen en el repositorio al 2026-10-25; que haya archivos de prueba no significa que cubran todo._
