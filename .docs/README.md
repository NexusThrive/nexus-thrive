---
id: guia
titulo: "Guía de construcción de NEXUS"
type: indice
created: 2026-10-23
updated: 2026-10-23
tags: [guia, vision, capas, ruta]
---

# Guía de construcción de NEXUS

Esta carpeta es **la guía de qué construimos y en qué orden**. Las capas
(`capas/`) describen todo lo que NEXUS puede llegar a ser; este documento dice
**hacia dónde vamos ahora**, qué ya está hecho y qué sigue.

| Documento | Para qué |
| --- | --- |
| Este README | Visión, objetivos, progreso y ruta por fases |
| [capas/](capas/README.md) | Las 11 capas, 70 subcapas y su escalera de madurez N0–N6, con casillas de hecho/pendiente |
| [vision-negocio-conectado.md](vision-negocio-conectado.md) | **A dónde llegamos:** negocio visible, que vende en línea y conectado por dentro (facturación, contabilidad, POS, inventario, visibilidad); la barra de Presencia en dos fases; puertos listos para DIAN y Wompi; n8n en casa |
| [hoja-de-ruta-implementacion.md](hoja-de-ruta-implementacion.md) | **Cómo empezamos:** 30 PR en orden de dependencia, cómo se migra y por dónde arrancar |
| [sql/](sql/README.md) | Borradores de esquema (SQL) de cada PR, validados contra Postgres |
| [integracion-api-mcp-webhooks.md](integracion-api-mcp-webhooks.md) | **Regla transversal:** todo tiene API, MCP y webhooks; pagos, DIAN y n8n por puertos; cómo ordenar el trabajo |
| [mapa-de-capacidades.md](mapa-de-capacidades.md) | Las 447 capacidades que usa una empresa contra las capas y el código: qué hay, qué falta y **qué sigue** |
| [fuentes/](fuentes/) | Material de origen de las capas (no se edita; se consulta) |
| [`docs/PENDIENTES.md`](../docs/PENDIENTES.md) | Lista viva de tareas, decisiones abiertas y la ruta de automatizaciones y agentes de IA |
| [`docs/nexus-architecture/`](../docs/nexus-architecture/README.md) | Arquitectura actual y objetivo, auditoría y decisiones técnicas |

---

## 1. Qué es NEXUS

> **Simplifica tu vida financiera y empresarial en un solo sitio.**

NEXUS es el **sistema operativo del negocio** para pymes en Colombia: el lugar
donde el negocio vende, cobra, factura ante la DIAN, controla inventario y
caja, atiende a sus clientes por WhatsApp y se hace visible en internet, con la
forma de su rubro (gimnasio, museo, constructora, comercio, servicios…).

Y sobre esa base, un negocio que **trabaja con automatizaciones y agentes de
IA** sin perder el control: el agente consulta y prepara; la persona aprueba;
el sistema ejecuta con permisos y deja rastro.

### Como Alegra, pero mejor

[Alegra](https://colombia.alegra.com/colombia/) es la referencia en Colombia
para pymes: software en la nube centrado en **facturación electrónica y
contabilidad**, con POS, inventario, nómina electrónica y tienda en línea
(revisar su sitio para el detalle vigente). Resuelve muy bien el cumplimiento
fiscal; la operación diaria de cada rubro queda en segundo plano.

NEXUS apunta a **igualar lo fiscal integrándolo** y a **ganar en todo lo
demás**:

| Dimensión | Enfoque tipo Alegra | NEXUS |
| --- | --- | --- |
| Punto de partida | La factura y la contabilidad | La operación diaria del negocio; la factura y la contabilidad salen de ella |
| Rubros | Genérico para todos | Se adapta al rubro: términos, módulos y pantallas propias (membresías y control de acceso QR/NFC, taquilla con aforo, obra con APU, Lean y bitácora) |
| Clientes | Directorio para facturar | CRM 360°: historial, pagos, membresías, notas, carné con QR/NFC |
| Caja | Caja y bancos | Caja menor real: turnos, arqueo, vales, reposición, soporte escaneado con OCR |
| Dinero | Registro de pagos | Cobro transaccional: sin cobros duplicados, recibo firmado con QR, anulación auditada; Nequi y pasarelas con conciliación (objetivo) |
| Atención | — | WhatsApp del negocio y asistente con IA que responde con datos reales (objetivo) |
| Automatización | Reglas propias del producto | n8n + agentes con herramientas y permisos, MCP de NEXUS (objetivo) |
| Presencia digital | — | Diagnóstico de presencia, mini-sitio con catálogo, SEO local y Google Business (objetivo) |
| Facturación DIAN y contabilidad | Propias (es su fuerte) | Por **proveedor tecnológico** detrás de un puerto; contabilidad exportable al contador. Alegra misma podría ser ese proveedor |
| Precio | Planes cerrados | Hoy códigos de activación a medida; después capacidades con cupos por rubro |

**Regla de producto:** no competir con un contable en su terreno ni reescribir
lo regulado (firma DIAN, nómina electrónica). Integrarlo bien y diferenciarse
en operación, rubro, atención e IA.

---

## 2. Regla transversal: todo tiene API, MCP y webhooks

> Nada de NEXUS existe solo como pantalla. Lo que el sistema hace, lo puede
> hacer también otro sistema (**API**), un agente de IA (**MCP**) o un flujo de
> **n8n** (**webhooks** y API). Se define una vez en el registro de operaciones
> y de ahí salen la ruta REST, la herramienta MCP, el evento y la
> documentación. Pagos (Nequi, pasarelas), facturación **DIAN** y demás
> proveedores entran por **puertos y adaptadores**, nunca atados al dominio.

Cada subcapa lleva su **Superficie de integración** (recursos, eventos,
herramientas MCP) y sus casillas, que se cuentan aparte en el progreso.
Reglas, estándares, seguridad, escalabilidad y definición de «hecho»:
[`integracion-api-mcp-webhooks.md`](integracion-api-mcp-webhooks.md).

## 2.1 Objetivos nuevos (2026)

Estos objetivos se agregaron dentro de las subcapas con la marca
_(objetivo 2026)_; el detalle está en [`docs/PENDIENTES.md`](../docs/PENDIENTES.md).

| Objetivo | Subcapas |
| --- | --- |
| **API interna y MCP de NEXUS**: una sola puerta para integraciones y agentes, con permisos, módulos y bitácora | [X.02](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md) |
| **Automatizaciones con n8n** conectado por la API y eventos de NEXUS | [VI.08](capas/VI-Operacion-Productividad-y-Logistica/08-Automatizaciones-y-Flujos-de-Trabajo/README.md), [I.05](capas/I-Fundacion-Nucleo-e-Infraestructura/05-Motor-de-Eventos-y-Webhooks/README.md) |
| **Agente de IA del negocio**: consultas de solo lectura primero, luego acciones con aprobación | [IX.04](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/04-Copiloto-de-Inteligencia-Artificial/README.md) |
| **Asistente por WhatsApp** vinculado al negocio y al integrante verificado | [III.01](capas/III-Atencion-y-Comunicacion/01-Agentes-Conversacionales-e-Inteligencia-Artificial/README.md), [III.00](capas/III-Atencion-y-Comunicacion/00-Bandeja-de-Entrada-Omnicanal/README.md) |
| **Pagos con Nequi** (QR dinámico, confirmación verificable, suscripciones) | [V.00](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md), [V.02](capas/V-Ventas-Digitales-Comercio-y-Pagos/02-Suscripciones-y-Cobros-Recurrentes/README.md) |
| **Códigos de activación a medida y cupos de uso** (precio, módulos, límites; IA y mensajes medidos) | [X.00](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md) |
| **Factura electrónica por proveedor tecnológico** | [VII.04](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/04-Facturacion-Electronica-y-RADIAN/README.md) |

Reglas que no se negocian en todo lo de IA (ver `docs/PENDIENTES.md` §5.2): el
servidor decide el negocio y el usuario, el agente responde con datos reales,
lo que escribe pide confirmación, el dinero solo lo mueve el servicio de
dinero, todo queda en la bitácora y hay cupos.

---

## 3. Progreso

Cuenta las casillas de *Funcionalidad* de cada subcapa. Una casilla se marca
solo si existe en el producto, con una nota de dónde (_hecho: …_).

<!-- progreso:inicio -->
| Capa | Nombre | Nivel N1 (lo básico) | Todas las funcionalidades | Integración (API · MCP · Webhooks) | |
| --- | --- | --- | --- | --- | --- |
| I | [FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA](capas/I-Fundacion-Nucleo-e-Infraestructura/README.md) | 17/34 · 50 % | 21/138 · 15 % | 0/47 · 0 % | `██░░░░░░░░` |
| II | [VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL](capas/II-Visibilidad-Captacion-y-Presencia-Digital/README.md) | 3/26 · 12 % | 4/170 · 2 % | 0/42 · 0 % | `░░░░░░░░░░` |
| III | [ATENCIÓN Y COMUNICACIÓN](capas/III-Atencion-y-Comunicacion/README.md) | 1/9 · 11 % | 1/78 · 1 % | 0/30 · 0 % | `░░░░░░░░░░` |
| IV | [GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/README.md) | 4/14 · 29 % | 4/92 · 4 % | 0/30 · 0 % | `░░░░░░░░░░` |
| V | [VENTAS DIGITALES, COMERCIO Y PAGOS](capas/V-Ventas-Digitales-Comercio-y-Pagos/README.md) | 5/24 · 21 % | 8/162 · 5 % | 0/48 · 0 % | `░░░░░░░░░░` |
| VI | [OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA](capas/VI-Operacion-Productividad-y-Logistica/README.md) | 7/36 · 19 % | 7/247 · 3 % | 0/54 · 0 % | `░░░░░░░░░░` |
| VII | [CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/README.md) | 9/31 · 29 % | 13/195 · 7 % | 0/48 · 0 % | `█░░░░░░░░░` |
| VIII | [TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO](capas/VIII-Talento-Humano-y-Administracion-del-Equipo/README.md) | 0/23 · 0 % | 0/173 · 0 % | 0/48 · 0 % | `░░░░░░░░░░` |
| IX | [INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/README.md) | 8/26 · 31 % | 8/128 · 6 % | 0/35 · 0 % | `█░░░░░░░░░` |
| X | [PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/README.md) | 11/18 · 61 % | 19/127 · 15 % | 0/30 · 0 % | `█░░░░░░░░░` |
| XI | [ESPECIALIZACIÓN POR VERTICAL](capas/XI-Especializacion-por-Vertical/README.md) | 0/0 · — | 0/0 · — | 0/6 · 0 % | `` |
| | **Total** | **65/241 · 27 %** | **85/1510 · 6 %** | **0/418 · 0 %** | |

_Generado con `node scripts/capas-progreso.mjs --write`. La capa XI (construcción) usa pestañas en lugar de casillas: su estado está en su README. «Integración» cuenta las casillas de la superficie API · MCP · Webhooks de cada subcapa (no suman al porcentaje de funcionalidades)._
<!-- progreso:fin -->

Además de lo contado arriba, ya está hecha la base que no aparece como
casilla: seguridad de la auditoría, servicio de dinero transaccional, matriz de
permisos, módulos exigidos en el servidor, esquema único con RLS, CI con
pruebas (ver [remediation-log](../docs/nexus-architecture/remediation-log.md)).

**Construcción (capa XI): N1 completo** — obra con presupuesto APU/AIU, línea
base, Lean, bitácora con fotos, actas de avance, informes y explosión de
materiales ([estado](capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md#estado-actual-2026-10-23)).

---

## 4. Ruta por fases

Cada fase deja el producto vendible y se apoya en la anterior. Coincide con
[product-vision.md §4](../docs/nexus-architecture/product-vision.md).

### Fase 1 · Base estable — ✅ hecha (PR #45, #46)

Seguridad P0/P1, permisos, dinero transaccional, aislamiento por negocio,
esquema único, CI. Subcapas: I.02 N1, I.03 N1, I.04 N1, I.06 N1, IX.01 N1.

### Fase 2 · Cimientos del sistema — en curso

El orden sale del [mapa de capacidades](mapa-de-capacidades.md#qué-es-lo-siguiente-en-realidad):
la cadena de una venta se rompe en el documento comercial, la cartera y los
eventos, porque hoy una venta vive en cinco formas distintas.

| # | Qué | Subcapas | Notas |
| --- | --- | --- | --- |
| 0 | ~~Códigos de activación a medida~~ (hecho 2026-10-23) | X.00 | En paralelo: precio, módulos y límites por cliente |
| 1 | ~~Registro de capacidades y separar construcción de cotizaciones~~ (hecho 2026-10-23) | X.00, IV.02 | ARCH-01 / ADR-0003 |
| 2 | **Documento comercial unificado** (cotización, pedido, factura o recibo, nota crédito; líneas, impuestos, descuentos, estados, numeración) | I.00, V.06 | En curso (2026-10-23): servidor hecho — venta al cobrar, nota crédito al anular, conversión, informe del día; falta la pantalla. Siguiente: [propuesta](../docs/nexus-architecture/propuesta-bloque-b-3-a-7.md) |
| 3 | Cartera: abonos, pagos parciales, cuentas por cobrar por antigüedad | VII.02 | Sobre el servicio de dinero |
| 4 | POS de varias líneas | V.03 | Sobre el documento |
| 5 | Tercero único mínimo e importar/exportar clientes y catálogo | I.00, I.01, IV.00 | Requisito DIAN y migración desde Excel o Alegra |

### Fase 2B · Columna de integración — a construir **junto** con la Fase 2

Se construye **una vez** y todo lo posterior la hereda: cada subcapa nueva solo
declara su operación. Detalle en
[`integracion-api-mcp-webhooks.md`](integracion-api-mcp-webhooks.md).

| # | Qué | Subcapas |
| --- | --- | --- |
| 1 | Registro de operaciones (módulo, permiso, esquema, riesgo) hermano del registro de capacidades | X.02, I.03 |
| 2 | API `/api/v1` de lectura: llaves por negocio, alcances, límites, errores y OpenAPI | X.02 N1–N2 |
| 3 | Outbox transaccional y webhooks firmados con reintentos y reenvío | I.05 N1–N3 |
| 4 | Servidor MCP de solo lectura generado del registro | X.02 N2, IX.04 N1 |
| 5 | Bitácora con origen (persona, llave, agente) y cupos básicos de uso | I.06, X.00 |
| 6 | Nodo de n8n y primeras plantillas de flujo | VI.08, X.02 |

### Fase 3 · Vender, cobrar y facturar

| Qué | Subcapas |
| --- | --- |
| POS: impresora térmica, lector de código de barras, turnos por cajero | V.03 |
| Inventario completo: fotos, variantes, listas de precios, mínimos y reorden, kardex | I.01, VI.04 |
| Documentos: remisión, devoluciones, cartera por cliente con recordatorios | V.06, VII.02, VII.03 |
| Pagos en línea: Nequi y pasarela (link, QR, webhook verificado, conciliación) | V.00, V.01 |
| Factura electrónica y documento POS por proveedor tecnológico | VII.04 |
| Compras y proveedores | VI.05 |

### Fase 4 · Atender y automatizar

| Qué | Subcapas |
| --- | --- |
| API de escritura con idempotencia y MCP con aprobación (la lectura y los eventos vienen de la Fase 2B) | X.02, I.05 |
| n8n con flujos de producción | VI.08 |
| Agente de consulta → acciones con aprobación | IX.04 |
| WhatsApp Business por negocio y asistente | III.00, III.01 |
| Recordatorios y cobros recurrentes automáticos | VI.01, V.02, II.05 |
| Cupos de uso y medición de costo | X.00 |

### Fase 5 · Que te encuentren

| Qué | Subcapas |
| --- | --- |
| Mini-sitio del negocio con catálogo y reservas | II.00, V.04, V.05 |
| SEO local y Google Business | II.01 |
| Redes sociales y contenido | II.06 |
| Fidelización: puntos, cupones, referidos | II.04 |

### Fase 6 · Equipo, contabilidad y ecosistema

| Qué | Subcapas |
| --- | --- |
| Exportación contable y contador externo | VII.05 |
| Personas: expediente, turnos, asistencia del equipo | VIII.00, VIII.02 |
| Nómina electrónica (si hay demanda, por proveedor) | VIII.03 |
| Varios negocios por persona | I.04 N2 |
| Dashboards por rubro y por rol, reportes automáticos | IX.00, IX.03 |

### Cómo se recorre

El plan concreto —30 PR, de lo más básico a lo más avanzado, con su esquema y
cómo se migra— está en
[`hoja-de-ruta-implementacion.md`](hoja-de-ruta-implementacion.md); lo que
queremos lograr, en [`vision-negocio-conectado.md`](vision-negocio-conectado.md).

No por capa completa ni «N1 de las 70 a la vez»: **columna de integración
primero, luego cadenas de valor completas a N1** (vender → cobrar → facturar;
atender y automatizar; conocer el negocio; que te encuentren; equipo y
contabilidad; operación por rubro), y de ahí subir a N2 por cadena. Las
razones y la definición de «cadena hecha» están en
[`integracion-api-mcp-webhooks.md` §10](integracion-api-mcp-webhooks.md#10-cómo-ordenar-el-trabajo).

Lo que no está en ninguna fase (por ejemplo producción y BOM industrial,
marketplace, telefonía) queda en las capas como posibilidad, sin fecha.

---

## 5. Cómo se mantiene esta guía

1. Al terminar algo, se marca su casilla: `- [x] Texto — _hecho: dónde está_`.
   Solo se marca lo que existe de punta a punta (pantalla → servidor → base).
2. Un objetivo nuevo se agrega como casilla en la subcapa y nivel que le
   corresponden, con la marca _(objetivo AAAA)_. Toda subcapa nueva nace con su
   **Superficie de integración** (datos en `scripts/capas-integracion.data.mjs`;
   `node scripts/capas-integracion.mjs --write` la escribe).
3. Se regenera el progreso:

   ```bash
   node scripts/capas-progreso.mjs --write
   ```

4. Si cambia el orden de las fases, se actualiza la §4 de este README y
   `docs/nexus-architecture/product-vision.md`.

## Estructura de la carpeta

```
.docs/
├── README.md        ← esta guía (visión, objetivos, progreso, ruta)
├── capas/           ← 11 capas · 70 subcapas · escalera N0–N6
│   ├── README.md    ← índice de capas con progreso
│   └── <capa>/<subcapa>/README.md
└── fuentes/         ← material de origen (no se edita)
    ├── DesordenadoCapas.md
    └── EstructuraCapasImplementacion.md
```
