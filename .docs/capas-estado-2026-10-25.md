# Estado de las casillas de las capas (25 de octubre de 2026)

Corte previo a llevar la rama `release/nexus-v2-todo-junto` a `main`. Solo se marca una casilla cuando hay código **y** una prueba que la sustente; lo que depende de un servicio externo real o de una decisión pendiente queda sin marcar y se explica.

## Avance (generado con `node scripts/capas-progreso.mjs`)
| | N1 (lo básico) | Todas las funcionalidades |
|---|---|---|
| Antes de esta revisión | 101/241 · 42 % | 139/1510 · 9 % |
| **Ahora** | **108/241 · 45 %** | **155/1510 · 10 %** |

## Casillas marcadas en esta revisión (con su evidencia)
| Casilla | Capa | Evidencia |
|---|---|---|
| Barra de Presencia en dos fases | II.00 N2 | `lib/presence/pillars*.ts`, `maturity.ts`, `notices.ts` + integración con Postgres + e2e |
| Clientes y proveedores · Detección de duplicados | I.01 N1/N2 | `lib/parties/parties.integration.test.ts` (rol sobre la misma ficha, duplicados blandos, aislamiento) |
| Variantes · Listas de precios · Clasificación fiscal por ítem | I.01 N2 | `lib/catalog/catalog.integration.test.ts` |
| Catálogo con búsqueda, categorías y código de barras | V.03 | `catalog.integration.test.ts` + `barcode.test.ts` |
| Múltiples bodegas · Kardex · Método de costeo · Descuento automático al facturar y suma al recibir compras | VI.04 | `lib/inventory/inventory.integration.test.ts`, `purchases.integration.test.ts`, `pos.integration.test.ts` |
| Gestión de resoluciones y consecutivos | VII.04 | `lib/tax/tax.test.ts` + integración de numeración |
| Enlaces cortos · Formulario simple · UTM automáticos · Reporte simple por origen | II.02 / II.03 | `lib/growth/growth.integration.test.ts` + e2e |
| Enlace a Google Reviews | III.04 | `growth.integration.test.ts` |

## Hecho en código pero **sin marcar** (a propósito)
| Casilla | Motivo |
|---|---|
| Ficha de Google Business (II) | Solo probada con Google simulado: falta una ficha real |
| Una pasarela (Wompi) conectada · Pago con tarjeta/PSE/Nequi · Nequi Negocios (V) | Wompi: contratos y firma probados, no contra Wompi real; Nequi no existe |
| Factura electrónica · PDF y XML · Estado ante la DIAN · Notas electrónicas (VII.04) | Hay puerto, proveedor de prueba y adaptador HTTP; falta proveedor real, PDF/XML y estado oficial |
| Terceros y centros de costo en cada asiento (VII) | Los asientos no los llevan todavía |
| Pulso del negocio con avisos por WhatsApp/correo (IX) | Las señales y los eventos existen; el envío real (n8n) no |
| Plantillas por vertical, imágenes y subdominio (II) · Catálogo con fotos · Pedido por correo y WhatsApp · Formulario de reserva (V) | No implementados |
| n8n conectado por la API · Documentación pública interactiva | No verificado / no existe |
| Beneficiario · Tipo de comprobante · Impuestos por ítem y por tercero · Ficha de tercero completa | Parciales: faltan campos o reglas |
| «Detección de duplicados» (CRM-360, Caja menor) y «Variantes» (Comercio electrónico) | Son casillas distintas a las de I.01; no se tocan |

Las tablas por capa están en `.docs/capas/README.md`; el estado de cada PR, en `.docs/ejecucion-nocturna.md`.
